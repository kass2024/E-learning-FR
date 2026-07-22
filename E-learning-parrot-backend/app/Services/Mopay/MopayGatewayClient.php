<?php

namespace App\Services\Mopay;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Portable MoPay Gateway V1 client (aligned with parrot_mis payments/mopay/auth.php + start.php).
 *
 * Copy this class into any Laravel app and point config at that project's own MOPAY_* env vars.
 * Each project must use its own merchant credentials, callback URL, and signing key so webhook
 * registration on /api/v1/user/settings does not overwrite another product.
 */
class MopayGatewayClient
{
    /** @var array<string, mixed> */
    protected array $config;

    /**
     * @param  array<string, mixed>|null  $config  Defaults to config('services.mopay')
     */
    public function __construct(?array $config = null)
    {
        $this->config = $config ?? (array) config('services.mopay', []);
    }

    /**
     * Build a client from an arbitrary config array (useful for multi-tenant / other projects).
     *
     * @param  array<string, mixed>  $config
     */
    public static function fromConfig(array $config): self
    {
        return new self($config);
    }

    public function isConfigured(): bool
    {
        return trim((string) ($this->config['auth_key'] ?? '')) !== ''
            && trim((string) ($this->config['server_base_url'] ?? '')) !== '';
    }

    public function projectSlug(): string
    {
        $slug = preg_replace('/[^a-z0-9_-]+/i', '_', (string) ($this->config['project_slug'] ?? 'app')) ?: 'app';

        return strtolower($slug);
    }

    public function serverBaseUrl(): string
    {
        return rtrim((string) ($this->config['server_base_url'] ?? ''), '/');
    }

    /**
     * Rwanda MoMo MSISDN as 12 digits: 2507XXXXXXXX (same as parrot_mis).
     */
    public function normalizeMsisdn(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        if (str_starts_with($digits, '250') && strlen($digits) >= 12) {
            return substr($digits, 0, 12);
        }
        if (str_starts_with($digits, '0') && strlen($digits) >= 10) {
            return '250' . substr($digits, 1, 9);
        }
        if (strlen($digits) === 9 && str_starts_with($digits, '7')) {
            return '250' . $digits;
        }

        return $digits;
    }

    /**
     * Value for the Authorization header (no "Authorization:" prefix).
     *
     * Matches parrot_mis mopay_get_authorization_value():
     * 1) MOPAY_BEARER_TOKEN if set
     * 2) Cached /token access_token (Bearer)
     * 3) Fallback: raw MOPAY_AUTH_KEY (NOT "Basic " wrapped)
     */
    public function authorizationHeader(): string
    {
        $bearer = trim((string) ($this->config['bearer_token'] ?? ''));
        if ($bearer !== '') {
            return stripos($bearer, 'bearer ') === 0 ? $bearer : 'Bearer ' . $bearer;
        }

        $cacheKey = 'mopay.access_token.' . $this->projectSlug();
        $cached = Cache::get($cacheKey);
        if (is_array($cached) && !empty($cached['access_token']) && !empty($cached['expires_at'])) {
            if (time() < ((int) $cached['expires_at'] - 60)) {
                return 'Bearer ' . (string) $cached['access_token'];
            }
        }

        $authKey = trim((string) ($this->config['auth_key'] ?? ''));
        if ($authKey === '') {
            throw new \RuntimeException('Missing MOPAY_AUTH_KEY.');
        }

        $token = $this->fetchAccessToken($authKey);
        if ($token !== null) {
            return 'Bearer ' . $token;
        }

        // Critical: parrot_mis uses the auth_key value as-is (often raw base64, not "Basic …").
        return $authKey;
    }

    protected function fetchAccessToken(string $authKey): ?string
    {
        $basicCredential = $authKey;
        if (stripos($basicCredential, 'basic ') === 0) {
            $basicCredential = trim(substr($basicCredential, 6));
        }

        $serverBase = $this->serverBaseUrl();
        $tokenUrls = [];

        $explicit = trim((string) ($this->config['token_url'] ?? ''));
        if ($explicit !== '') {
            $tokenUrls[] = $explicit;
        }
        if ($serverBase !== '') {
            $tokenUrls[] = $serverBase . '/token';
            $tokenUrls[] = preg_replace('#^http://#', 'https://', $serverBase) . '/token';
        }
        $tokenUrls[] = 'https://preproduction-gateway.bizao.com/token';
        $tokenUrls = array_values(array_unique(array_filter($tokenUrls)));

        $headers = [
            'Authorization' => 'Basic ' . $basicCredential,
            'Content-Type' => 'application/x-www-form-urlencoded',
            'Accept' => 'application/json',
        ];

        foreach ($tokenUrls as $tokenUrl) {
            try {
                $res = Http::withHeaders($headers)
                    ->asForm()
                    ->timeout(20)
                    ->post($tokenUrl, ['grant_type' => 'client_credentials']);

                if (!$res->successful() || !$res->json('access_token')) {
                    Log::debug('MoPay token fetch skipped', [
                        'project' => $this->projectSlug(),
                        'url' => $tokenUrl,
                        'http' => $res->status(),
                    ]);
                    continue;
                }

                $accessToken = (string) $res->json('access_token');
                $expiresIn = (int) ($res->json('expires_in') ?? 3600);
                $expiresAt = time() + max(60, $expiresIn);

                Cache::put('mopay.access_token.' . $this->projectSlug(), [
                    'access_token' => $accessToken,
                    'expires_at' => $expiresAt,
                    'token_url' => $tokenUrl,
                ], max(60, $expiresIn));

                return $accessToken;
            } catch (\Throwable $e) {
                Log::warning('MoPay token fetch failed', [
                    'project' => $this->projectSlug(),
                    'url' => $tokenUrl,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return null;
    }

    /**
     * @return array<string, string>
     */
    public function defaultApiHeaders(bool $withBizaoCategory = true): array
    {
        $headers = [
            'Authorization' => $this->authorizationHeader(),
            'Content-Type' => 'application/json; charset=UTF-8',
            'Accept' => 'application/json',
        ];

        if ($withBizaoCategory) {
            $headers['category'] = (string) ($this->config['category'] ?? 'BIZAO');
        }

        return $headers;
    }

    /**
     * Collect money from a customer MoMo wallet (payment+transfer or debit-only).
     *
     * @param  array{
     *   account_no: string,
     *   amount: int,
     *   transaction_id: string,
     *   title?: string,
     *   details?: string,
     *   message?: string,
     *   transfer_message?: string,
     *   receiver_account_no?: string|null,
     *   currency?: string,
     *   country_code?: string,
     *   mno?: string,
     *   use_transfer?: bool
     * }  $input
     * @return array{ok:bool,http_status:int,flow:string,url:string,request:array,response:mixed,raw:string,auth_mode:string}
     */
    public function initiateCollection(array $input): array
    {
        $amount = (int) ($input['amount'] ?? 0);
        $transactionId = (string) ($input['transaction_id'] ?? '');
        $accountNo = $this->normalizeMsisdn((string) ($input['account_no'] ?? ''));
        $currency = (string) ($input['currency'] ?? $this->config['default_currency'] ?? 'RWF');
        $country = strtolower((string) ($input['country_code'] ?? $this->config['default_country_code'] ?? 'rw'));
        $mno = (string) ($input['mno'] ?? $this->config['default_mno'] ?? 'mtn');
        $receiver = trim((string) ($input['receiver_account_no'] ?? $this->config['receiver_account_no'] ?? ''));
        $useTransfer = ($input['use_transfer'] ?? true) && $receiver !== '';

        $prefix = preg_replace('/[^A-Za-z0-9_]/', '', (string) ($this->config['message_prefix'] ?? 'MOPAY')) ?: 'MOPAY';
        $message = (string) ($input['message'] ?? ($prefix . '_PAYMENT'));
        $transferMessage = (string) ($input['transfer_message'] ?? ($prefix . '_RECEIVER_TRANSFER'));

        $base = $this->serverBaseUrl();
        $url = $useTransfer ? $base . '/api/v1/payment' : $base . '/api/v2/momo/debit';

        if ($useTransfer) {
            $receiverMsisdn = $this->normalizeMsisdn($receiver);
            $payload = [
                'transactionId' => $transactionId,
                'account_no' => $accountNo,
                'title' => (string) ($input['title'] ?? $this->config['payment_title'] ?? 'Service Payment'),
                'details' => (string) ($input['details'] ?? $this->config['payment_details'] ?? 'Authorized customer payment'),
                'payment_type' => 'momo',
                'amount' => $amount,
                'currency' => $currency,
                'message' => $message,
                'transfers' => [[
                    'transactionId' => $transactionId . '_T',
                    'account_no' => $receiverMsisdn,
                    'payment_type' => 'momo',
                    'amount' => $amount,
                    'currency' => $currency,
                    'message' => $transferMessage,
                ]],
            ];
            $flow = 'payment_with_transfer';
        } else {
            $payload = [
                'account_no' => $accountNo,
                'payment_type' => 'momo',
                'message' => $message,
                'transactionId' => $transactionId,
                'currency' => $currency,
                'amount' => $amount,
                'country_code' => $country,
                'mno' => $mno,
            ];
            $flow = 'debit_only';
        }

        $authValue = $this->authorizationHeader();
        $headers = [
            'Authorization' => $authValue,
            'Content-Type' => 'application/json; charset=UTF-8',
            'Accept' => 'application/json',
            'category' => (string) ($this->config['category'] ?? 'BIZAO'),
        ];

        $res = Http::withHeaders($headers)->timeout(60)->post($url, $payload);
        $body = $res->json();
        $raw = $res->body();

        // parrot_mis start.php: retry once if transfer amount mismatch; enable allow_transfer_cap.
        if (
            $useTransfer
            && $res->status() >= 400
            && is_array($body)
            && isset($body['message'])
            && is_string($body['message'])
            && stripos($body['message'], 'Total Transfer amount not match with paid amount') !== false
        ) {
            Http::withHeaders($headers)->timeout(30)->post($base . '/api/v1/user/settings', [
                'id' => 'allow_transfer_cap',
                'value' => true,
            ]);

            $res = Http::withHeaders($headers)->timeout(60)->post($url, $payload);
            $body = $res->json();
            $raw = $res->body();
        }

        return [
            'ok' => $res->successful(),
            'http_status' => $res->status(),
            'flow' => $flow,
            'url' => $url,
            'request' => $payload,
            'response' => $body,
            'raw' => $raw,
            'auth_mode' => $this->describeAuthMode($authValue),
            'msisdn' => $accountNo,
        ];
    }

    /**
     * Register this project's webhook URL + signing key on the MoPay merchant settings.
     * Warning: MoPay stores one callback_url per merchant — use a dedicated merchant per project.
     *
     * @return array{ok:bool,callback_url:string,callback_url_http:int,callback_url_body:string,signing_key_http:int,signing_key_body:string}
     */
    public function registerCallbackSettings(?string $callbackUrl = null): array
    {
        $secret = (string) ($this->config['callback_signing_key'] ?? '');
        if ($secret === '') {
            return [
                'ok' => false,
                'callback_url' => '',
                'callback_url_http' => 0,
                'callback_url_body' => 'MOPAY_CALLBACK_SIGNING_KEY is empty.',
                'signing_key_http' => 0,
                'signing_key_body' => '',
            ];
        }

        $callbackUrl = $callbackUrl
            ?: (string) ($this->config['callback_url'] ?? '');

        $settingsUrl = $this->serverBaseUrl() . '/api/v1/user/settings';
        $headers = $this->defaultApiHeaders(false);

        $urlRes = Http::withHeaders($headers)->timeout(30)->post($settingsUrl, [
            'id' => 'callback_url',
            'value' => $callbackUrl,
        ]);

        $keyRes = Http::withHeaders($headers)->timeout(30)->post($settingsUrl, [
            'id' => 'callback_signing_key',
            'value' => $secret,
        ]);

        return [
            'ok' => $urlRes->successful() && $keyRes->successful(),
            'callback_url' => $callbackUrl,
            'callback_url_http' => $urlRes->status(),
            'callback_url_body' => $urlRes->body(),
            'signing_key_http' => $keyRes->status(),
            'signing_key_body' => $keyRes->body(),
        ];
    }

    public function describeAuthMode(string $authValue): string
    {
        if (stripos($authValue, 'bearer ') === 0) {
            return 'bearer';
        }
        if (stripos($authValue, 'basic ') === 0) {
            return 'basic_prefix';
        }

        return 'raw_auth_key';
    }
}

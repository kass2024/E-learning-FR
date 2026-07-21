<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Hash;

class Student extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'first_name',
        'last_name',
        'email',
        'password',
        'status',
        'phone',
        'country',
        'primary_goal',
        'platform_institution_id',
        'document_path',
        'document_url',
    ];

    protected $appends = [];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        // add casts here if you later add extra JSON/date columns
    ];

    protected static function booted(): void
    {
        static::saving(function (Student $student) {
            // Keep legacy DB `name` column in sync (NOT NULL, no default).
            $full = trim(
                (string) ($student->getAttribute('first_name') ?? '') . ' ' .
                (string) ($student->getAttribute('last_name') ?? '')
            );
            $student->setAttribute(
                'name',
                $full !== '' ? $full : (string) ($student->getAttribute('email') ?? '')
            );
        });
    }

    public function setNameAttribute($value): void
    {
        $this->attributes['name'] = (string) $value;
    }

    public function getNameAttribute(): string
    {
        $full = trim(
            (string) ($this->attributes['first_name'] ?? '') . ' ' .
            (string) ($this->attributes['last_name'] ?? '')
        );

        if ($full !== '') {
            return $full;
        }

        if (!empty($this->attributes['name'])) {
            return (string) $this->attributes['name'];
        }

        return (string) ($this->attributes['email'] ?? '');
    }

    /**
     * Automatically hash password when setting it.
     */
    public function setPasswordAttribute($value): void
    {
        if (empty($value)) {
            $this->attributes['password'] = null;
            return;
        }
        // Avoid double-hashing: if it already looks like a bcrypt hash, keep it.
        if (is_string($value) && strlen($value) === 60 && preg_match('/^\$2y\$|^\$2a\$|^\$2b\$/', $value)) {
            $this->attributes['password'] = $value;
        } else {
            $this->attributes['password'] = Hash::make($value);
        }
    }

    public function platformInstitution()
    {
        return $this->belongsTo(PlatformInstitution::class, 'platform_institution_id');
    }
}

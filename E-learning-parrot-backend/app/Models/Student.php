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
            $first = (string) ($student->getAttributes()['first_name'] ?? '');
            $last = (string) ($student->getAttributes()['last_name'] ?? '');
            $email = (string) ($student->getAttributes()['email'] ?? '');
            $full = trim($first . ' ' . $last);
            $student->name = $full !== '' ? $full : $email;
        });
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

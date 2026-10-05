<?php

namespace App\Support;

use Illuminate\Validation\Rules\Password;

/**
 * Central place for account security rules so the same policy is enforced
 * on every endpoint that creates or changes credentials.
 *
 * Panel requirements:
 *  - Username: email, or a name with a number (e.g. carlos01)
 *  - Password: hard password with special character
 */
class SecurityRules
{
    /** Letters first, must contain at least one number, 4–30 chars, may use . or _ */
    public const USERNAME_REGEX = '/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z][A-Za-z0-9._]{3,29}$/';

    public const USERNAME_MESSAGE = 'Username must start with a letter, contain at least one number, and be 4–30 characters (letters, numbers, . or _ only). Example: carlos01';

    /** Max failed logins before temporary lockout. */
    public const MAX_LOGIN_ATTEMPTS = 5;

    /** Lockout duration in seconds after too many failed logins. */
    public const LOCKOUT_SECONDS = 60;

    /**
     * Strong password: min 8 chars, upper + lower case, number, and special character.
     */
    public static function password(): Password
    {
        return Password::min(8)
            ->mixedCase()
            ->numbers()
            ->symbols();
    }

    public static function username(): array
    {
        return ['string', 'regex:' . self::USERNAME_REGEX];
    }
}

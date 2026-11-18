<?php

namespace App\Support;

/**
 * Areas an admin can be limited to. An admin with no list has full access.
 */
final class AdminPermissions
{
    public const ALL = ['people', 'events', 'media', 'check_in', 'meals', 'accommodation', 'merch', 'finance'];

    /**
     * Normalise a submitted list: null (full access) stays null, unknown keys are dropped.
     *
     * @param  list<string>|null  $permissions
     * @return list<string>|null
     */
    public static function normalise(?array $permissions): ?array
    {
        if ($permissions === null) {
            return null;
        }

        return array_values(array_intersect(self::ALL, $permissions));
    }
}

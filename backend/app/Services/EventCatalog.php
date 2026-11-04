<?php

namespace App\Services;

/**
 * The canonical list of MIV gatherings. Used by the seeder and by the
 * migration that backfills existing Jan Conf delegates into IMLC.
 */
class EventCatalog
{
    public const PRIMARY_SLUG = 'imlc';

    /**
     * Times are stored in UTC (the app timezone); Nigeria is UTC+1,
     * so 16:00 here is 5:00 PM in Ibadan.
     *
     * @return list<array<string, mixed>>
     */
    public static function all(): array
    {
        $onsiteOrOnline = ['Onsite', 'Online'];

        return [
            [
                'slug' => 'imlc',
                'title' => "International Ministers' & Leadership Conference",
                'short_name' => 'IMLC',
                'summary' => 'For ministers and leaders in every sphere of influence.',
                'date_label' => '19–24 Jan 2027',
                'starts_at' => '2027-01-19 16:00:00',
                'ends_at' => '2027-01-24 13:00:00',
                'location' => 'Olororo, Ojoo, Ibadan',
                'image' => '/images/photos/lp-hero.webp',
                'attendance_options' => ['Onsite in Ibadan', 'Online'],
                'day_options' => ['Tue 19', 'Wed 20', 'Thu 21', 'Fri 22', 'Sat 23', 'Sun 24'],
                'offers_accommodation' => true,
                'is_featured' => true,
                'registration_open' => true,
                'programme' => [
                    ['day' => 'Sat 23', 'sessions' => [
                        ['time' => '7:00 AM', 'title' => 'Arrival & check-in', 'detail' => 'Gates A and B'],
                        ['time' => '9:00 AM', 'title' => 'Royal Conference', 'detail' => 'Main hall · until 1 PM'],
                        ['time' => '1:00 PM', 'title' => 'Lunch', 'detail' => 'Meal points 1–3'],
                        ['time' => '2:00 PM', 'title' => 'IYLC', 'detail' => 'Main hall · ages 16–45 · until 8 PM'],
                    ]],
                ],
                'publicity' => [
                    'caption' => 'The 37th IMLC & IYLC holds 19–24 January 2027 in Ibadan. Registration is free. #JanConf2027 #IMLC2027',
                    'assets' => [
                        ['title' => 'Official flyer', 'image' => '/images/publicity/flyer-square.jpg'],
                        ['title' => 'Promo banner', 'image' => '/images/publicity/flyer-preview.jpg'],
                        ['title' => 'WhatsApp status', 'image' => '/images/publicity/flyer-status.jpg'],
                        ['title' => 'Logo pack', 'image' => '/images/miv-logo.png'],
                    ],
                ],
            ],
            [
                'slug' => 'bbr',
                'title' => 'Back to Bethel Retreat (BBR)',
                'short_name' => 'BBR',
                'summary' => "A retreat for ministers' wives, elect ladies and female leaders.",
                'date_label' => 'Date TBA',
                'image' => '/images/photos/lp-about-2.webp',
                'attendance_options' => $onsiteOrOnline,
                'is_featured' => true,
                'registration_open' => true,
            ],
            [
                'slug' => 'royal',
                'title' => "Royal Fathers' Conference",
                'short_name' => 'Royal Fathers',
                'summary' => 'For traditional rulers committed to kingdom-minded leadership.',
                'date_label' => 'Sat 23 Jan 2027',
                'starts_at' => '2027-01-23 09:00:00',
                'location' => 'Olororo, Ojoo, Ibadan',
                'image' => '/images/photos/lp-reg.webp',
                'attendance_options' => ['Onsite in Ibadan'],
                'is_featured' => true,
                'registration_open' => true,
            ],
            [
                'slug' => 'iylc',
                'title' => 'International Young Leaders Conference',
                'short_name' => 'IYLC',
                'summary' => 'Equipping emerging leaders aged 16–45.',
                'date_label' => 'Sat 23 Jan 2027',
                'starts_at' => '2027-01-23 08:00:00',
                'location' => 'Olororo, Ojoo, Ibadan',
                'image' => '/images/photos/lp-about-1.webp',
                'attendance_options' => ['Onsite in Ibadan', 'Online'],
                'is_featured' => true,
                'registration_open' => true,
            ],
            [
                'slug' => 'family',
                'title' => 'Family Life Conference',
                'short_name' => 'Family Life',
                'summary' => 'Helping believers lead their homes as God intends.',
                'date_label' => 'Date TBA',
                'image' => '/images/photos/lp-hotel.webp',
                'attendance_options' => $onsiteOrOnline,
                'is_featured' => true,
                'registration_open' => true,
            ],
            [
                'slug' => 'awg',
                'title' => 'Alone With God Prayer Retreat (AWG)',
                'short_name' => 'AWG',
                'summary' => 'Days set apart for prayer, fasting and seeking God.',
                'date_label' => 'Date TBA',
                'image' => '/images/photos/lp-hero-m.webp',
                'attendance_options' => $onsiteOrOnline,
                'is_featured' => true,
                'registration_open' => true,
            ],
            ['slug' => 'armed', 'title' => 'Armed Forces Outreach', 'short_name' => 'Armed Forces', 'summary' => 'Reaching and ministering to men and women in uniform.', 'image' => '/images/photos/lp-host-1.webp'],
            ['slug' => 'academic', 'title' => 'Academic Banquet & Summit', 'short_name' => 'Academic', 'summary' => 'Honouring and equipping leaders in the academic community.', 'image' => '/images/photos/lp-reg.webp'],
            ['slug' => 'fire', 'title' => 'Let The Fire Fall', 'short_name' => 'Fire Fall', 'summary' => 'A night of worship, prayer and revival.', 'image' => '/images/photos/lp-hero.webp'],
            ['slug' => 'singles', 'title' => "Singles' Connect", 'short_name' => 'Singles', 'summary' => 'Fellowship, teaching and counsel for single believers.', 'image' => '/images/photos/lp-about-2.webp'],
            ['slug' => 'lu', 'title' => 'Leadership Update', 'short_name' => 'Leadership Update', 'summary' => 'Practical sessions to sharpen leaders through the year.', 'image' => '/images/photos/lp-about-1.webp'],
            ['slug' => 'missions', 'title' => 'Missions Conferences', 'short_name' => 'Missions', 'summary' => 'Mobilising the church to reach the unreached.', 'image' => '/images/photos/lp-host-2.webp'],
        ];
    }

    /** Fill defaults so every row has the same columns. */
    public static function rows(): array
    {
        return array_map(fn (array $event, int $index): array => [
            'title' => $event['title'],
            'short_name' => $event['short_name'],
            'summary' => $event['summary'],
            'date_label' => $event['date_label'] ?? 'Date TBA',
            'starts_at' => $event['starts_at'] ?? null,
            'ends_at' => $event['ends_at'] ?? null,
            'location' => $event['location'] ?? null,
            'image' => $event['image'] ?? null,
            'attendance_options' => $event['attendance_options'] ?? ['Onsite', 'Online'],
            'day_options' => $event['day_options'] ?? null,
            'offers_accommodation' => $event['offers_accommodation'] ?? false,
            'programme' => $event['programme'] ?? null,
            'publicity' => $event['publicity'] ?? null,
            'is_featured' => $event['is_featured'] ?? false,
            'registration_open' => $event['registration_open'] ?? true,
            'sort_order' => $index + 1,
            'slug' => $event['slug'],
        ], self::all(), array_keys(self::all()));
    }
}

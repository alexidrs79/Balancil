<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Hourly generation keeps due dates aligned with each user's reporting timezone.
Schedule::command('recurring:generate-drafts')->hourly();
// Drift check only — never --fix here. Free Render has no cron by default;
// wire schedule:run separately or recurring drafts stay idle on the demo.
Schedule::command('ledger:reconcile')->daily();

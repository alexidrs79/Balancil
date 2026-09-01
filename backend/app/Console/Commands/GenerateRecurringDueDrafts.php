<?php

namespace App\Console\Commands;

use App\Services\RecurringTransactionService;
use Illuminate\Console\Command;

class GenerateRecurringDueDrafts extends Command
{
    protected $signature = 'recurring:generate-drafts {--through= : Generate drafts through this date}';

    protected $description = 'Generate reviewable drafts for due recurring transactions';

    public function handle(RecurringTransactionService $service): int
    {
        $count = $service->generateThrough($this->option('through'));

        $this->info("Generated {$count} recurring due draft(s).");

        return self::SUCCESS;
    }
}

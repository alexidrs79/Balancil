<?php

use App\Services\GoalContributionService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('goal_contributions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('goal_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 14, 2);
            $table->date('date');
            $table->string('note')->nullable();
            $table->timestamps();
            $table->index(['goal_id', 'date']);
        });

        app(GoalContributionService::class)->backfillFromExistingSaved();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('goal_contributions');
    }
};

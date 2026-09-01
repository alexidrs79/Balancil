<?php

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
        Schema::create('account_transfers', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('from_account_id')->constrained('accounts')->restrictOnDelete();
            $table->foreignUuid('to_account_id')->constrained('accounts')->restrictOnDelete();
            $table->decimal('amount', 14, 2);
            $table->date('date');
            $table->string('description')->default('');
            $table->enum('status', ['completed', 'pending', 'failed'])->default('completed');
            $table->timestamps();
            $table->index(['user_id', 'date']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('account_transfers');
    }
};

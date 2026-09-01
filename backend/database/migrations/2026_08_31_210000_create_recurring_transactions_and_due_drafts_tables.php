<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recurring_transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('account_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('category_id')->constrained()->restrictOnDelete();
            $table->string('merchant', 120);
            $table->string('description')->default('');
            $table->decimal('amount', 14, 2);
            $table->enum('type', ['income', 'expense']);
            $table->enum('frequency', ['weekly', 'biweekly', 'monthly', 'yearly']);
            $table->unsignedSmallInteger('interval')->default(1);
            $table->date('start_date');
            $table->date('next_due_date');
            $table->date('end_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['is_active', 'next_due_date']);
            $table->index(['user_id', 'next_due_date']);
        });

        Schema::create('recurring_due_drafts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('recurring_transaction_id')
                ->constrained('recurring_transactions')
                ->cascadeOnDelete();
            $table->date('due_date');
            $table->json('payload');
            $table->enum('status', ['pending', 'posted', 'skipped'])->default('pending');
            $table->foreignUuid('transaction_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->unique(['recurring_transaction_id', 'due_date']);
            $table->index(['user_id', 'status', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recurring_due_drafts');
        Schema::dropIfExists('recurring_transactions');
    }
};

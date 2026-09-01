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
        Schema::create('preferences', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('currency', 3)->default('USD');
            $table->string('company')->nullable();
            $table->string('country')->nullable();
            $table->string('timezone')->default('UTC');
            $table->string('number_format')->default('1,234.56');
            $table->boolean('two_factor_enabled')->default(false);
            $table->json('notifications');
            $table->timestamps();
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->enum('type', ['income', 'expense']);
            $table->string('color')->default('#64748b');
            $table->string('icon')->default('circle');
            $table->timestamps();
            $table->unique(['user_id', 'name', 'type']);
        });

        Schema::create('accounts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->enum('type', ['checking', 'savings', 'credit', 'cash']);
            $table->decimal('balance', 14, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->string('last_four', 4)->nullable();
            $table->string('institution')->default('');
            $table->string('color')->default('#2563eb');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('account_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('category_id')->constrained()->restrictOnDelete();
            $table->string('merchant');
            $table->string('description')->default('');
            $table->decimal('amount', 14, 2);
            $table->enum('type', ['income', 'expense']);
            $table->date('date');
            $table->enum('status', ['completed', 'pending', 'failed'])->default('completed');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->index(['user_id', 'date']);
        });

        Schema::create('budgets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('category_id')->constrained()->restrictOnDelete();
            $table->decimal('limit', 14, 2);
            $table->enum('period', ['weekly', 'monthly', 'yearly'])->default('monthly');
            $table->timestamps();
            $table->unique(['user_id', 'category_id', 'period']);
        });

        Schema::create('goals', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('account_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->decimal('target', 14, 2);
            $table->decimal('saved', 14, 2)->default(0);
            $table->date('deadline');
            $table->string('color')->default('#16a34a');
            $table->timestamps();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type');
            $table->uuidMorphs('notifiable');
            $table->text('data');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('goals');
        Schema::dropIfExists('budgets');
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('accounts');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('preferences');
    }
};

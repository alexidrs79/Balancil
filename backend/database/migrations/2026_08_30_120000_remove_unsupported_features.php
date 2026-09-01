<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('password_reset_tokens');

        Schema::table('accounts', function (Blueprint $table) {
            $table->dropColumn(['currency', 'last_four']);
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn('notes');
        });

        Schema::table('goals', function (Blueprint $table) {
            $table->dropConstrainedForeignId('account_id');
        });

        Schema::table('preferences', function (Blueprint $table) {
            $table->dropColumn([
                'company',
                'country',
                'timezone',
                'number_format',
                'two_factor_enabled',
                'notifications',
            ]);
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('password_reset_tokens')) {
            Schema::create('password_reset_tokens', function (Blueprint $table) {
                $table->string('email')->primary();
                $table->string('token');
                $table->timestamp('created_at')->nullable();
            });
        }

        if (! Schema::hasColumn('preferences', 'company')) {
            Schema::table('preferences', function (Blueprint $table) {
                $table->string('company')->nullable();
                $table->string('country')->nullable();
                $table->string('timezone')->default('UTC');
                $table->string('number_format')->default('1,234.56');
                $table->boolean('two_factor_enabled')->default(false);
                $table->json('notifications')->nullable();
            });
        }

        if (! Schema::hasColumn('accounts', 'currency')) {
            Schema::table('accounts', function (Blueprint $table) {
                $table->string('currency', 3)->default('USD');
                $table->string('last_four', 4)->nullable();
            });
        }

        if (! Schema::hasColumn('transactions', 'notes')) {
            Schema::table('transactions', function (Blueprint $table) {
                $table->text('notes')->nullable();
            });
        }

        if (! Schema::hasColumn('goals', 'account_id')) {
            Schema::table('goals', function (Blueprint $table) {
                $table->foreignUuid('account_id')->nullable()->constrained()->nullOnDelete();
            });
        }

        if (! Schema::hasTable('notifications')) {
            Schema::create('notifications', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('type');
                $table->uuidMorphs('notifiable');
                $table->text('data');
                $table->timestamp('read_at')->nullable();
                $table->timestamps();
            });
        }
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->string('ip_address', 45)->nullable()->after('abilities');
            $table->text('user_agent')->nullable()->after('ip_address');
        });

        Schema::table('preferences', function (Blueprint $table) {
            $table->string('locale', 35)->default('en-US')->after('currency');
            $table->string('timezone')->default('UTC')->after('locale');
            $table->string('week_start', 3)->default('mon')->after('timezone');
        });
    }

    public function down(): void
    {
        Schema::table('personal_access_tokens', function (Blueprint $table) {
            $table->dropColumn(['ip_address', 'user_agent']);
        });

        Schema::table('preferences', function (Blueprint $table) {
            $table->dropColumn(['locale', 'timezone', 'week_start']);
        });
    }
};

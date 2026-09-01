<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BudgetController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmailChangeController;
use App\Http\Controllers\GoalContributionController;
use App\Http\Controllers\GoalController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\ProfileImageController;
use App\Http\Controllers\RecurringDueDraftController;
use App\Http\Controllers\RecurringTransactionController;
use App\Http\Controllers\SessionController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\TransferController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('/forgot-password', [PasswordResetController::class, 'forgot'])->middleware('throttle:5,1');
Route::post('/reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:5,1');
Route::post('/email-change/confirm', [EmailChangeController::class, 'confirm'])->middleware('throttle:5,1');
Route::get('/profile-images/{user}/{filename}', [ProfileImageController::class, 'show'])
    ->middleware(['signed', 'throttle:60,1'])
    ->name('profile-images.show');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::delete('/me', [SettingsController::class, 'destroy'])->middleware('throttle:5,1');
    Route::get('/dashboard', DashboardController::class);
    Route::get('/analytics', AnalyticsController::class);
    Route::apiResource('categories', CategoryController::class)->except('show');
    Route::apiResource('accounts', AccountController::class)->except('show');
    Route::apiResource('transactions', TransactionController::class)->except('show');
    Route::apiResource('recurring-transactions', RecurringTransactionController::class);
    Route::get('/recurring-drafts/pending', [RecurringDueDraftController::class, 'pending']);
    Route::get('/recurring-drafts/history', [RecurringDueDraftController::class, 'history']);
    Route::post('/recurring-drafts/{draft}/post', [RecurringDueDraftController::class, 'post']);
    Route::post('/recurring-drafts/{draft}/skip', [RecurringDueDraftController::class, 'skip']);
    Route::apiResource('transfers', TransferController::class)->except('show');
    Route::apiResource('budgets', BudgetController::class)->except('show');
    Route::apiResource('goals', GoalController::class)->except('show');
    Route::scopeBindings()->group(function () {
        Route::get('/goals/{goal}/contributions', [GoalContributionController::class, 'index']);
        Route::post('/goals/{goal}/contributions', [GoalContributionController::class, 'store']);
        Route::delete('/goals/{goal}/contributions/{contribution}', [GoalContributionController::class, 'destroy']);
    });
    Route::get('/settings', [SettingsController::class, 'show']);
    Route::put('/settings/profile', [SettingsController::class, 'profile']);
    Route::post('/settings/profile-image', [ProfileImageController::class, 'store'])->middleware('throttle:10,1');
    Route::delete('/settings/profile-image', [ProfileImageController::class, 'destroy']);
    Route::put('/settings/preferences', [SettingsController::class, 'preferences']);
    Route::put('/settings/password', [SettingsController::class, 'password'])->middleware('throttle:5,1');
    Route::get('/settings/email-change', [EmailChangeController::class, 'pending']);
    Route::post('/settings/email-change', [EmailChangeController::class, 'store'])->middleware('throttle:5,1');
    Route::delete('/settings/email-change', [EmailChangeController::class, 'cancel']);
    Route::get('/sessions', [SessionController::class, 'index']);
    Route::delete('/sessions/others', [SessionController::class, 'destroyOthers']);
    Route::delete('/sessions/{token}', [SessionController::class, 'destroy']);
});

<?php

namespace App\Http\Controllers;

use App\Services\FinanceService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AnalyticsController extends Controller
{
    public function __invoke(Request $request, FinanceService $service): array
    {
        $data = $request->validate([
            'months' => ['sometimes', 'integer', 'between:1,24'],
            'from' => ['nullable', 'date_format:Y-m-d', 'required_with:to'],
            'to' => ['nullable', 'date_format:Y-m-d', 'required_with:from', 'after_or_equal:from'],
        ]);

        if (
            isset($data['from'], $data['to'])
            && Carbon::parse($data['from'])->diffInMonths(Carbon::parse($data['to'])) > 24
        ) {
            throw ValidationException::withMessages([
                'to' => 'Choose a date range of 24 months or less.',
            ]);
        }

        return $service->analytics(
            $request->user(),
            (int) ($data['months'] ?? 6),
            $data['from'] ?? null,
            $data['to'] ?? null,
        );
    }
}

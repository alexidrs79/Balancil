<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RecurringTransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'accountId' => $this->account_id,
            'categoryId' => $this->category_id,
            'merchant' => $this->merchant,
            'description' => $this->description,
            'amount' => (float) $this->amount,
            'type' => $this->type,
            'frequency' => $this->frequency,
            'interval' => $this->interval,
            'startDate' => $this->start_date->toDateString(),
            'nextDueDate' => $this->next_due_date->toDateString(),
            'endDate' => $this->end_date?->toDateString(),
            'isActive' => $this->is_active,
        ];
    }
}

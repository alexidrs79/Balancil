<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class RecurringDueDraftResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'templateId' => $this->recurring_transaction_id,
            'dueDate' => $this->due_date->toDateString(),
            'payload' => $this->payload,
            'status' => $this->status,
            'transactionId' => $this->transaction_id,
            'reviewedAt' => $this->reviewed_at?->toISOString(),
        ];
    }
}

<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransactionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'merchant' => $this->merchant,
            'description' => $this->description, 'amount' => (float) $this->amount,
            'type' => $this->type, 'categoryId' => $this->category_id,
            'accountId' => $this->account_id, 'date' => $this->date->toDateString(),
            'status' => $this->status,
        ];
    }
}

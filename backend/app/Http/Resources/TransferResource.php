<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TransferResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'fromAccountId' => $this->from_account_id,
            'toAccountId' => $this->to_account_id,
            'amount' => (float) $this->amount,
            'date' => $this->date->toDateString(),
            'description' => $this->description,
            'status' => $this->status,
        ];
    }
}

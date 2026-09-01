<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BudgetResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'categoryId' => $this->category_id,
            'limit' => (float) $this->limit, 'spent' => (float) ($this->spent ?? 0),
            'period' => $this->period,
        ];
    }
}

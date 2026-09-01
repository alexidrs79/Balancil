<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GoalContributionResource extends JsonResource
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
            'goalId' => $this->goal_id,
            'amount' => (float) $this->amount,
            'date' => $this->date->toDateString(),
            'note' => $this->note,
        ];
    }
}

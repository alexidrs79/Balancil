<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Http\UploadedFile;

class RealProfileImage implements ValidationRule
{
    /**
     * @param  array<int, int>  $allowedTypes
     */
    public function __construct(private readonly array $allowedTypes) {}

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! $value instanceof UploadedFile || ! $value->isValid()) {
            $fail('The image must be a valid JPEG, PNG, or WebP file.');

            return;
        }

        $info = @getimagesize($value->getRealPath());
        if ($info === false || ! in_array($info[2], $this->allowedTypes, true)) {
            $fail('The image must be a valid JPEG, PNG, or WebP file.');
        }
    }
}

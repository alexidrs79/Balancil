<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProfileImageRequest;
use App\Http\Resources\UserResource;
use App\Services\ProfileImageService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProfileImageController extends Controller
{
    public function __construct(private readonly ProfileImageService $profileImages) {}

    public function store(StoreProfileImageRequest $request): array
    {
        $user = $this->profileImages->store($request->user(), $request->file('image'));

        return ['user' => new UserResource($user)];
    }

    public function show(string $user, string $filename): StreamedResponse
    {
        abort_unless(
            preg_match('/^[0-9a-f-]{36}$/i', $user) === 1
            && preg_match('/^[0-9a-f-]{36}\.(?:jpe?g|png|webp)$/i', $filename) === 1,
            404,
        );

        $path = ProfileImageService::DIRECTORY.'/'.$user.'/'.$filename;
        abort_unless(Storage::disk(ProfileImageService::DISK)->exists($path), 404);

        return Storage::disk(ProfileImageService::DISK)->response($path, null, [
            'Cache-Control' => 'private, max-age=3600',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }

    public function destroy(Request $request): array
    {
        $user = $this->profileImages->remove($request->user());

        return ['user' => new UserResource($user)];
    }
}

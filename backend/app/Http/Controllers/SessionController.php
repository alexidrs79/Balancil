<?php

namespace App\Http\Controllers;

use App\Http\Resources\SessionResource;
use App\Services\SessionService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class SessionController extends Controller
{
    public function __construct(private readonly SessionService $sessions) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        return SessionResource::collection($this->sessions->all($request->user()));
    }

    public function destroy(Request $request, int $token): Response
    {
        $this->sessions->delete($request->user(), $token);

        return response()->noContent();
    }

    public function destroyOthers(Request $request): Response
    {
        $currentTokenId = $request->user()->currentAccessToken()?->getKey();
        $this->sessions->deleteOthers(
            $request->user(),
            $currentTokenId === null ? null : (int) $currentTokenId,
        );

        return response()->noContent();
    }
}

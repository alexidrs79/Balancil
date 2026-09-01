<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;

class CategoryController extends Controller
{
    public function index()
    {
        return CategoryResource::collection(
            request()->user()->categories()->orderBy('type')->orderBy('name')->get()
        );
    }

    public function store(StoreCategoryRequest $request)
    {
        $category = $request->user()->categories()->create($request->validated());

        return (new CategoryResource($category))->response()->setStatusCode(201);
    }

    public function update(StoreCategoryRequest $request, Category $category): CategoryResource
    {
        $category->update($request->validated());

        return new CategoryResource($category->refresh());
    }

    public function destroy(Category $category)
    {
        if ($category->transactions()->exists() || $category->budgets()->exists()) {
            return response()->json([
                'message' => 'Categories used by transactions or budgets cannot be deleted.',
            ], 409);
        }
        if ($category->recurringTransactions()->exists()) {
            return response()->json([
                'message' => 'Categories used by recurring schedules cannot be deleted.',
            ], 409);
        }

        $category->delete();

        return response()->noContent();
    }
}

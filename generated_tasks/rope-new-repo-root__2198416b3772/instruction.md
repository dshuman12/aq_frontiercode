# Task description

Add a method that returns the *canonical* path of a pyname's definition so callers can identify where a name is defined, regardless of how it was imported.

Implement `path_to_resource(project, path, type=None)` in `rope/base/libutils.py`. Given a project and a filesystem path (absolute or project-relative), it should return the matching `rope.base.resources.Resource`. The optional `type` argument selects the resource kind: pass `'file'` to obtain a `File`, `'folder'` to obtain a `Folder`, and `None` to auto-detect based on what exists on disk. Paths outside the project should still resolve to a resource backed by that real path (using the project's out-of-project handling), so the helper works for standard-library and site-packages modules too.

Keep this consistent with `Project`'s existing resource accessors (`get_file`, `get_folder`, `get_resource`) and its out-of-project resource support. Ensure `modname` and other existing `libutils` helpers continue to behave unchanged. Update `docs/library.rst` to mention the new helper.

Success means callers can take any path reported by a pyname's definition location and obtain a usable `Resource` object, whether or not the path lives inside the project.

# Test guidelines

Run `pytest` from the repository root. Add or extend tests under `ropetest` (notably `ropetest/projecttest.py`) covering: resolving project-relative and absolute paths, explicit `'file'` vs `'folder'` selection, auto-detection when `type` is `None`, and resolving a path that lies outside the project root. Do not rely on machine-specific absolute paths; derive them from project fixtures.

# Lint guidelines

Keep imports and naming consistent with the surrounding `rope.base` modules. Avoid introducing unused imports or names, and match the existing two-space-before-inline-comment and PEP 8 conventions already used across the codebase.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

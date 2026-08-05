# Technical Analysis — v1.16.1-r2

## Failure point

The original installer failed during `[1/7]`, before target validation,
backup creation, or file copying. The PowerShell parameter default for
`PackageRoot` was not reliable in the affected invocation context.

## Corrected contract

The batch installer now calculates an absolute package directory using
`%~dp0.` and passes it explicitly as `-PackageRoot` to every verifier.
The PowerShell scripts independently recover their script directory when the
argument is missing, trim quotes, expand environment variables, verify that
the value is nonempty, and resolve it with literal-path semantics.

## Compatibility

The hotfix accepts either a v1.16.0-r5 base tree or an existing v1.16.1 tree.
It is safe to use as the first v1.16.1 installation because it contains the
complete reviewed application payload.

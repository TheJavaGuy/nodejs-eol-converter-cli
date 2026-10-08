# Newlines (EOL) converter CLI

*Having troubles with different line endings?* :flushed:

This library will simply convert files of your choice to Windows (`CRLF`), or popular `LF` line ends used on Linux and Mac.

Installation:

```
npm i -g eol-converter-cli
```

API: `eolConverter <lf|crlf|warmup> "glob_pattern"`

* The mode is mandatory: `lf`, `crlf`, or `warmup` (dry run) - see examples.
* File paths are resolved with a [glob pattern](https://www.npmjs.com/package/glob). Quote it so your shell does not expand it.
* Requires Node.js 16 or newer.

## Examples

Run just warmup - to see which files will be affected:

```
eolConverter warmup "**/*.js"
```

Run conversions (cannot be undone):

**To LF (Unix & Mac default)**

```
eolConverter lf "**/*.js"
eolConverter lf "**/*.{js,jsx,ts,tsx}"
eolConverter lf "src/**/*.js"
eolConverter lf "{src,tests}/**/*.js"
```

**To CRLF (Windows default)**

```
eolConverter crlf "**/*.js"
```

## Behaviour

* Every `\r\n`, lone `\r` and `\n` is normalized to the target line ending. A lone `\r` (classic Mac) is intentionally rewritten too.
* Only regular files that are valid UTF-8 and contain no NUL byte are touched. Binary files, UTF-16 files, symlinks and files above 256 MiB are skipped with a message.
* `**/node_modules/**` and `**/.git/**` are always ignored.
* Files whose content would not change are not rewritten, so their mtime stays intact.
* Writes are atomic: content goes to a temp file next to the target and is renamed over it.
* Exit code is `0` on success, `1` if any file failed, `2` on usage error or when no file matched.

## Tips

PS: Don't forget to configure you favourite IDE to work with desired line endings, so that you won't need this tool again! :smirk:

**Please give project :star: if you like it!**

## License

Apache 2.0 &copy; [Juraj Husár](https://jurosh.com)

# dm-langclient-extender

Extends the existing DreamMaker Language Client for Visual Studio Code with additional quality-of-life improvements for BYOND DM development.

## Features

### Automatic Language Server Restart

Automatically restarts the language server whenever a `.dm` file is changed, created, or deleted, eliminating the need to restart it manually.

### Automatic Multi-Line Comments

Will automatically write

```
/**
 *
/**
```

When you type

```
/**
```
And press enter

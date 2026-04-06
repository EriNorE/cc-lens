# Running cc-lens as a systemd Service

Run cc-lens as a persistent daemon on headless Linux servers.

## Prerequisites

- Node.js 18+ installed (via nvm or system package)
- cc-lens cloned and `npm install` completed
- `~/.claude/` directory exists with session data

## Service File

Copy the example service file and edit for your environment:

```bash
sudo cp cc-lens.service.example /etc/systemd/system/cc-lens.service
sudo nano /etc/systemd/system/cc-lens.service
```

Fill in `<username>` and `<node-version>` placeholders, then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable cc-lens
sudo systemctl start cc-lens
```

## Verify

```bash
sudo systemctl status cc-lens
curl http://localhost:33033/api/health
```

## Notes

### nvm Users

systemd doesn't load nvm. You must specify the full path to `node` in both `ExecStart` and `Environment=PATH`:

```ini
Environment=PATH=/home/<username>/.nvm/versions/node/<node-version>/bin:/usr/local/bin:/usr/bin
ExecStart=/home/<username>/.nvm/versions/node/<node-version>/bin/node bin/cli.js --no-browser
```

### Headless Mode

Use `--no-browser` flag to skip the `xdg-open` call (fails silently on headless servers, but `--no-browser` is cleaner):

```bash
node bin/cli.js --no-browser
```

### Custom Port

```ini
Environment=CC_LENS_PORT=8080
```

### Logs

```bash
journalctl -u cc-lens -f
```

## Tested On

- Ubuntu 24.04 with Node v22.x
- Works on both physical and virtual machines

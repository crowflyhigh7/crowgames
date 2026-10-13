# CrowGames

`games.iamchang.me`에서 서비스할 정적 웹 게임 허브입니다.

## 로컬 실행

이 프로젝트는 빌드가 필요 없는 정적 사이트입니다. 루트의 `index.html`을 열거나 Cloudflare Pages 로컬 프리뷰를 사용할 수 있습니다.

```powershell
npm install
npm run dev
```

## GitHub에 푸시

현재 PC의 GitHub CLI 토큰이 만료되어 있다면 먼저 다시 로그인합니다.

```powershell
gh auth login -h github.com
```

새 저장소를 만들고 푸시합니다.

```powershell
git init
git add .
git commit -m "Create CrowGames hub"
git branch -M main
gh repo create crowgames --public --source=. --remote=origin --push
```

이미 GitHub 저장소가 있다면 아래처럼 원격만 연결해도 됩니다.

```powershell
git remote add origin https://github.com/<OWNER>/<REPO>.git
git branch -M main
git push -u origin main
```

## Cloudflare Pages 배포

### Git 연동 방식

Cloudflare Dashboard에서 Pages 프로젝트를 만들고 GitHub 저장소를 연결합니다.

- Project name: `crowgames`
- Production branch: `main`
- Build command: 비워둠
- Build output directory: `/`

배포 후 Custom domains에서 `games.iamchang.me`를 추가합니다. 도메인이 Cloudflare에 올라와 있다면 DNS 레코드는 자동으로 연결됩니다.

### CLI 방식

```powershell
npx wrangler login
npm run deploy
```

CLI 배포 후에도 `games.iamchang.me` 커스텀 도메인은 Cloudflare Pages 프로젝트의 Custom domains에서 추가합니다.

## GitHub Actions 자동 배포

`.github/workflows/deploy-cloudflare-pages.yml`가 포함되어 있습니다. GitHub 저장소 Secrets에 아래 값을 추가하면 `main` 브랜치 푸시마다 Cloudflare Pages로 배포됩니다.

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

API 토큰은 Cloudflare Pages 배포 권한이 있는 토큰을 사용하세요.

## 새 게임 추가

1. 루트 아래에 새 게임 폴더를 추가합니다.
2. 해당 폴더 안에 `index.html`을 둡니다.
3. 루트 `index.html`의 게임 목록에 카드 하나를 추가합니다.

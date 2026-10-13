# CrowGames

`games.iamchang.me`에서 서비스할 정적 웹 게임 허브입니다.

## 로컬 실행

이 프로젝트는 정적 사이트입니다. 루트의 `index.html`을 열거나 Cloudflare Pages 로컬 프리뷰를 사용할 수 있습니다. `npm run build`는 공개 웹 파일과 게임 폴더만 `dist`에 복사합니다. 루트의 메모, 인증 파일, 개발 도구는 배포하지 않습니다.

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
- Build command: `npm run build`
- Build output directory: `dist`

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

워크플로는 `crowgames` Pages 프로젝트가 없으면 생성하고, 배포 후 `games.iamchang.me` 커스텀 도메인을 등록합니다. Pages 권한만 있는 토큰은 DNS를 수정하지 못하므로, 최초 연결 시 Cloudflare 대시보드에서 도메인 설정을 완료하거나 `games` CNAME을 배포된 Pages 주소로 연결해야 합니다. 정확한 Pages 주소는 워크플로 로그에 표시됩니다.

## 새 게임 추가

1. 루트 아래에 새 게임 폴더를 추가합니다.
2. 해당 폴더 안에 `index.html`을 둡니다.
3. 루트 `index.html`의 게임 목록에 카드 하나를 추가합니다.
4. 아래 공통 홈 링크를 게임에 넣습니다.
5. `main`에 커밋하고 푸시합니다. 빌드가 새 게임 폴더를 자동으로 포함하고 Cloudflare에 배포합니다.

### 홈으로 가기 버튼

루트 바로 아래의 게임 폴더에서 사용하는 예시입니다. `<head>`에 공통 스타일을 연결합니다.

```html
<link rel="stylesheet" href="../shared/game-nav.css">
```

게임의 헤더나 설정 메뉴에 아래 링크를 넣습니다. 게임 보드를 가리지 않도록 일반 레이아웃 안에 배치하세요.

```html
<a class="crowgames-home" href="../"
   aria-label="CrowGames 홈으로" title="CrowGames 홈으로">홈</a>
```

지뢰찾기처럼 레트로 스타일을 사용하려면 `crowgames-home--retro` 클래스를 추가합니다. 공통 CSS와 Lucide 홈 아이콘은 `shared` 폴더에서 함께 관리하므로 게임마다 복사하지 않습니다. 링크는 자바스크립트 없이 작동합니다.

게임에서 전역 키보드 이벤트를 처리한다면 링크에 초점이 있는 동안 게임 입력을 처리하지 않도록 합니다. 예: `if (event.target instanceof Element && event.target.closest('a')) return;`. 이렇게 하면 Tab으로 홈 링크를 선택하고 Enter로 돌아갈 수 있습니다.

각 게임은 자신의 폴더 안에서 `index.html`, CSS, JavaScript와 이미지 파일을 참조해야 합니다. 루트보다 더 깊은 폴더에 게임을 배치하는 경우 공통 파일 경로와 홈 링크의 `../` 경로를 깊이에 맞게 조정하세요.

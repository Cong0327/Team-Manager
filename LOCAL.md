# 로컬 개발 명령어

## 기동

```bash
npm run dev
```

http://localhost:3000 에서 확인. `.env.local`에 Supabase/카카오 키가 없으면 페이지는 뜨지만
로그인·연동 기능은 동작하지 않는다.

## 종료 (Kill / Stop)

포그라운드에서 실행 중이면 실행한 터미널에서 `Ctrl+C`로 종료.

백그라운드로 떠 있거나 포트가 이미 점유돼서 죽여야 할 때:

**PowerShell**
```powershell
Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
```

**Git Bash**
```bash
netstat -ano | grep :3000
taskkill //PID <위에서 찾은 PID> //F
```

## 빌드 확인

```bash
npm run build
```

배포 전 타입 에러/빌드 에러를 로컬에서 먼저 잡을 때 사용.

## 린트

```bash
npm run lint
```

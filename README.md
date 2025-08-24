# Vercel API Proxy

정적 페이지로 배포된 프로젝트에서 안전하게 외부 API를 사용할 수 있도록 지원하는 프록시 서버입니다.

## 🎯 목적

- API 키를 안전하게 보호하기 위함.
- 무단 사용 방지를 위한 다층 보안 시스템
- 여러 프로젝트가 공통으로 사용할 수 있는 통합 프록시

## 🏗️ 아키텍처

```
[GitHub Pages] → [Vercel API Proxy] → [External APIs]
   (공개)             (보안 처리)         (API 키 필요)
```

## 🛡️ 보안 기능

- **도메인 검증**: 허용된 도메인에서만 접근 가능
- **JWT 토큰**: 1시간 만료 토큰 시스템
- **Rate Limiting**: IP별 요청 제한
- **다층 검증**: Origin, Referer, User-Agent 검증

## 📡 API 엔드포인트

### AssemblyAI 프록시
- `POST /api/assemblyai` - WebSocket URL 생성
- 응답: `{ "wsUrl": "wss://..." }`

### DeepL 프록시  
- `POST /api/deepl` - 번역 API 프록시
- 요청: `{ "text": "Hello", "target_lang": "KO" }`
- 응답: `{ "translations": [...] }`

### 인증
- `POST /api/auth/token` - JWT 토큰 발급

## 🚀 배포

1. Vercel 계정 연결
2. 환경 변수 설정
3. `vercel --prod` 배포
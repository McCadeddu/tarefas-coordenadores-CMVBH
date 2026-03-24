# Publicacao no Render

## Recomendacao

Use um Blueprint do Render com o arquivo `render.yaml` deste repositorio.

## O que ja esta pronto

- `render.yaml` cria o web service e o Postgres
- `DATABASE_URL` vem direto do banco do Render
- `AUTH_SECRET` e gerado automaticamente
- health check em `/api/health`
- `preDeployCommand` executa `prisma db push`

## Passo a passo

1. Suba este repositorio para GitHub.
2. No Render, clique em `New > Blueprint`.
3. Conecte o repositorio.
4. Confirme a criacao dos recursos:
   - web service `tarefas-coordenadores`
   - Postgres `tarefas-coordenadores-db`
5. Na primeira criacao, preencha os secrets marcados com `sync: false`:
   - `SMTP_HOST`
   - `SMTP_USER`
   - `SMTP_PASSWORD`
6. Finalize o deploy.
7. Depois do deploy, abra a URL `.onrender.com` gerada pelo Render.
8. Configure o dominio proprio na tela do servico.
9. O Render emite SSL automaticamente depois da validacao do dominio.

## Variaveis obrigatorias

- `DATABASE_URL`: vem do Postgres do Render
- `AUTH_SECRET`: gerado pelo Render
- `SMTP_HOST`: servidor SMTP institucional
- `SMTP_PORT`: normalmente `587`
- `SMTP_SECURE`: `false` para STARTTLS ou `true` se o provedor exigir SSL direto
- `SMTP_USER`: usuario SMTP
- `SMTP_PASSWORD`: senha SMTP
- `SMTP_FROM`: remetente, ex.: `noreply@villaregia.org`

## Antes de enviar o link aos coordenadores

1. Testar primeiro acesso com email `@villaregia.org`
2. Testar criacao de senha
3. Testar login normal
4. Testar criacao e edicao de processo
5. Configurar dominio proprio
6. Confirmar HTTPS ativo

## Opcao de URL inicial

Enquanto o dominio proprio nao estiver pronto, o Render fornece uma URL publica `onrender.com` que ja pode ser usada para testes internos.

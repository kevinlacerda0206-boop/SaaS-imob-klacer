# Como criar o projeto Supabase

1. Acesse https://supabase.com e crie uma conta (pode entrar com GitHub ou Google).
2. Clique em **New project**.
   - Nome: `saas-imobiliario` (ou o nome que preferir)
   - Senha do banco: gere uma forte e **guarde em um lugar seguro** (você não vai precisar digitá-la no dia a dia, mas é útil ter salva)
   - Região: escolha a mais próxima do Brasil (ex: `South America (São Paulo)`)
3. Espere o projeto provisionar (leva ~2 minutos).
4. No painel do projeto, vá em **Project Settings → API**. Você vai precisar de três valores:
   - **Project URL**
   - **anon public key**
   - **service_role key** (fica em "Reveal" — nunca exponha essa no frontend)
5. Me envie esses três valores aqui no chat (pode colar direto — eu vou colocar num arquivo `.env.local` que já está no `.gitignore`, então não entra no histórico do git).
6. Depois disso eu aplico a migration (`supabase/migrations/0001_init.sql`) no seu projeto e seguimos com a autenticação e a UI.

> Se preferir, você também pode instalar a Supabase CLI e rodar `supabase link` — mas colar as chaves aqui já é suficiente pra avançarmos.

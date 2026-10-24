(() => {
  const sourceRepo = 'LucasMiauMIL/MIL-Tool';
  const projectRepo = 'LucasMiauMIL/MIL-Projetos';
  const expectedHash = 'fb165dc3f79fbdbcbe834fe1071de55d458873a6a4e6d2168fb766fcbd78d443';
  document.getElementById('login-form').onsubmit = async event => {
    event.preventDefault();
    const input = document.getElementById('github-token');
    const button = document.getElementById('enter-button');
    const errorBox = document.getElementById('login-error');
    const token = input.value.trim();
    input.value = '';
    button.disabled = true; errorBox.textContent = '';
    button.textContent = 'Validando acesso...';
    async function get(path) {
      const response = await fetch('https://api.github.com' + path, {cache:'no-store',headers:{
        Authorization:'Bearer ' + token, Accept:'application/vnd.github+json', 'X-GitHub-Api-Version':'2022-11-28'}});
      if (!response.ok) throw new Error(response.status === 401 ? 'Token inválido ou expirado.' :
        response.status === 404 ? 'Acesso ainda não liberado. Solicite acesso aos repositórios da equipe.' :
        response.status === 403 ? 'Permissão insuficiente ou limite da API do GitHub atingido.' : 'Não foi possível conectar ao GitHub.');
      return response.json();
    }
    try {
      if (!crypto.subtle) throw new Error('Abra esta página por HTTPS para acessar os projetos.');
      const user = await get('/user');
      const source = await get('/repos/' + sourceRepo);
      const projects = await get('/repos/' + projectRepo);
      if (!source.private || !projects.private) throw new Error('Os repositórios da equipe precisam permanecer privados.');
      const file = await get('/repos/' + sourceRepo + '/contents/bundle.json');
      if (file.encoding !== 'base64' || file.size > 1000000) throw new Error('Pacote do revisor inválido.');
      const bytes = Uint8Array.from(atob(file.content.replace(/\s/g,'')), c => c.charCodeAt(0));
      const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b => b.toString(16).padStart(2,'0')).join('');
      if (digest !== expectedHash) throw new Error('O código privado mudou. A M.I.L. precisa publicar a entrada correspondente antes de continuar.');
      const bundle = JSON.parse(new TextDecoder().decode(bytes));
      if (bundle.formato !== 'MIL-PORTAL-1' || typeof bundle.html !== 'string') throw new Error('Versão do portal incompatível.');
      // Only the owner-maintained source repository supplies executable code.
      window.MILGithubContext = {token,repo:projectRepo,user,writable:Boolean(projects.permissions?.push)};
      document.open(); document.write(bundle.html); document.close();
    } catch (error) {
      window.MILGithubContext = null;
      errorBox.textContent = error.message || 'Falha ao carregar o portal.';
      button.disabled = false; button.textContent = 'Entrar na revisão';
    }
  };
})();

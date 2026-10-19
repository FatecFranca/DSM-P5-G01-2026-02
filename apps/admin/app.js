/*
 * Admin API contract: GET /setup/status; POST /setup|login returning JWT
 * Tokens; GET/PUT /draft; POST /validate, /publish {notes}; GET /versions;
 * POST /versions/{id}/restore {notes}; POST /assets/upload and
 * /assets/import-url. This client stores the JWT only in browser localStorage.
 */
const API = '/v1/admin';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { catalog: null, types: [], exercise: null, selectedUnit: null, image: null, media: [] };
const TYPE_TO_ITEM_KIND = Object.freeze({listen_choose:'letter',recognize_letter:'letter',find_in_word:'letter',initial_sound:'letter',find_all_in_word:'letter',compare_words:'letter',mixed_review:'letter',syllable_listen_choose:'syllable',complete_word:'letter',word_listen_choose:'word',word_from_syllables:'word',sentence_fill_word:'sentence',sentence_order:'sentence',syllable_position_choose:'syllable',word_image_choose:'word',sentence_image_choose:'sentence'});

function value(object, ...keys) { for (const key of keys) if (object?.[key] !== undefined && object[key] !== null) return object[key]; return ''; }
function items(object, ...keys) { const found = value(object, ...keys); return Array.isArray(found) ? found : []; }
function escapeHtml(input = '') { return String(input).replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[c])); }
function toast(message, error = false) { const node = document.createElement('div'); node.className = `toast${error ? ' error' : ''}`; node.textContent = message; $('#toast-region').append(node); setTimeout(() => node.remove(), 4400); }
function formatDetail(detail) {
  if (!detail) return '';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map(item => {
      if (typeof item === 'string') return item;
      const field = Array.isArray(item?.loc) ? item.loc.filter(part => part !== 'body').join('.') : '';
      const text = item?.msg || item?.message || JSON.stringify(item);
      return field ? `${field}: ${text}` : text;
    }).join(' · ');
  }
  if (typeof detail === 'object') return detail.message || detail.errors?.join?.(' · ') || JSON.stringify(detail);
  return String(detail);
}
function message(error) { return formatDetail(error?.payload?.detail) || error?.payload?.message || error?.message || 'Não foi possível concluir a operação.'; }
async function request(path, options = {}) {
  const headers = new Headers(options.headers || {}); let body = options.body;
  const token = localStorage.getItem('alfabetiza-admin-access');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (body && !(body instanceof FormData) && typeof body !== 'string') { headers.set('Content-Type', 'application/json'); body = JSON.stringify(body); }
  const response = await fetch(`${API}${path}`, { ...options, headers, body, credentials: 'same-origin' });
  const contentType = response.headers.get('content-type') || ''; const payload = contentType.includes('json') ? await response.json().catch(() => ({})) : await response.text();
  if (!response.ok) throw Object.assign(new Error(typeof payload === 'string' ? payload : payload?.detail || response.statusText), { payload, status: response.status });
  return payload;
}
function normalizeExercise(raw = {}) {
  const media = value(raw, 'image', 'media') || {};
  const payload = value(raw,'payload') || {};
  const asset = value(payload,'image_asset') || '';
  return { id:value(raw,'id','exerciseId','exercise_id'), kind:value(raw,'kind','type','exerciseType','exercise_type') || 'word_image_choose', instruction:value(raw,'instruction','prompt','enunciado'), ttsText:value(raw,'ttsText','tts_text','audioText','tts_fallback_text'), word:value(raw,'word','contextWord','context_word'), answer:value(raw,'answer','correctAnswer','correct_answer'), maskedWord:value(raw,'maskedWord','masked_word','displayWord','display_word') || value(payload,'masked_word'), choices:items(raw,'choices','alternatives','options').map(x => typeof x === 'string' ? x : value(x,'value','text','label')), imageId:value(raw,'imageId','image_id') || value(media,'id') || asset, imageUrl:value(raw,'imageUrl','image_url') || value(media,'url','path') || (asset ? `/v1/media/${asset.replace(/^media\//,'')}` : ''), imageAlt:value(raw,'imageAlt','image_alt') || value(media,'alt','altText','alt_text') || value(payload,'image_alt'), difficulty:String(value(raw,'difficulty','level') || value(payload,'difficulty') || '1'), positiveFeedback:value(raw,'positiveFeedback','positive_feedback','feedbackCorrect') || value(payload,'positive_feedback'), supportFeedback:value(raw,'supportFeedback','support_feedback','feedbackIncorrect') || value(payload,'support_feedback'), retired:value(raw,'review_status') === 'retired' || Boolean(value(raw,'retired','inactive','isRetired')) };
}
function normalizeCatalog(raw) {
  const trails = items(raw,'trails','tracks','data');
  return trails.map((trail, t) => ({ id:value(trail,'id','trackId','track_id') || `trail-${t}`, title:value(trail,'title','name','label') || `Trilha ${t + 1}`, units:items(trail,'units','modules','lessons').map((unit,u) => ({ id:value(unit,'id','unitId','unit_id') || `unit-${t}-${u}`, title:value(unit,'title','name','label') || `Unidade ${u + 1}`, letter:value(unit,'letter','focusLetter','focus_letter'), exercises:items(unit,'exercises','activities','items').map(normalizeExercise) })) }));
}
function renderTrails() {
  const root = $('#trail-list'); root.replaceChildren();
  for (const trail of state.catalog || []) { const section = document.createElement('section'); section.className = 'trail'; const heading = document.createElement('button'); heading.textContent = trail.title; heading.setAttribute('aria-expanded','true'); section.append(heading); const unitList = document.createElement('div'); unitList.className = 'unit-list';
    for (const unit of trail.units) { const unitButton = document.createElement('button'); unitButton.className = `unit${state.selectedUnit?.id === unit.id ? ' selected':''}`; unitButton.innerHTML = `<span class="unit-letter">${escapeHtml(unit.letter || '•')}</span><span>${escapeHtml(unit.title)}</span>`; unitButton.onclick = () => selectUnit(unit); unitList.append(unitButton);
      if (state.selectedUnit?.id === unit.id) { const exercises = document.createElement('div'); exercises.className = 'exercise-list'; for (const exercise of unit.exercises) { const button = document.createElement('button'); button.className = `exercise${state.exercise?.id === exercise.id ? ' active':''}`; button.textContent = exercise.instruction || exercise.word || exercise.kind; button.onclick = () => selectExercise(exercise); exercises.append(button); } if (!unit.exercises.length) exercises.innerHTML = '<p class="muted">Sem atividades</p>'; unitList.append(exercises); }
    } section.append(unitList); root.append(section); }
}
function renderKinds() { const select = $('#kind-field'); const current = state.exercise?.kind; select.replaceChildren(); const types = state.types.length ? state.types : [{id:'listen_choose',label:'Escuta e escolha',help:'Escolha a letra ouvida.'},{id:'recognize_letter',label:'Reconhecer letra',help:'Identifique a letra apresentada.'},{id:'initial_sound',label:'Som inicial',help:'Identifique o som no começo da palavra.'},{id:'find_all_in_word',label:'Encontre na palavra',help:'Localize todas as ocorrências da letra.'},{id:'compare_words',label:'Compare palavras',help:'Compare palavras para identificar a letra.'},{id:'mixed_review',label:'Revisão',help:'Reforce letras já praticadas.'},{id:'syllable_position_choose',label:'Posição da sílaba',help:'Escolha a sílaba inicial ou final.'},{id:'word_image_choose',label:'Palavra pela imagem',help:'Escolha a palavra correspondente à imagem.'},{id:'sentence_image_choose',label:'Frase pela imagem',help:'Escolha a frase correspondente à cena.'}];
  for (const type of types) { const option = document.createElement('option'); option.value = value(type,'id','value','kind'); option.textContent = value(type,'label','name','title') || option.value; option.dataset.help = value(type,'help','description'); select.append(option); } select.value = [...select.options].some(o => o.value === current) ? current : select.options[0]?.value; updateKindHelp(); }
function updateKindHelp() { const option = $('#kind-field').selectedOptions[0]; $('#kind-help').textContent = option?.dataset.help || 'O tipo define os campos necessários.'; const kind = $('#kind-field').value; const requiresChoices = !['find_all_in_word','word_from_syllables','sentence_order'].includes(kind); $('#choices-fields').hidden = !requiresChoices; }
function field(id, val) { $(id).value = val ?? ''; }
function renderChoices(choices = []) { const root = $('#choices-list'); root.replaceChildren(); (choices.length ? choices : ['', '', '']).forEach(choice => addChoice(choice)); }
function addChoice(choice = '') { const row = document.createElement('div'); row.className = 'choice-row'; row.innerHTML = `<input class="choice-value" value="${escapeHtml(choice)}" aria-label="Alternativa" placeholder="Alternativa" /><button type="button" aria-label="Remover alternativa">×</button>`; $('button',row).onclick = () => row.remove(); $('#choices-list').append(row); }
function renderMedia() { const preview = $('#image-preview'); preview.replaceChildren(); if (state.image?.url || state.exercise?.imageUrl) { const image = document.createElement('img'); image.src = state.image?.url || state.exercise.imageUrl; image.alt = state.image?.alt || state.exercise.imageAlt || ''; image.onerror = () => { preview.textContent = 'Não foi possível carregar esta imagem.'; }; preview.append(image); } else preview.innerHTML = '<span>Nenhuma imagem selecionada</span>'; }
function selectUnit(unit) { state.selectedUnit = unit; state.exercise = unit.exercises[0] || null; state.image = null; renderTrails(); renderEditor(); }
function selectExercise(exercise) { state.exercise = normalizeExercise(exercise); state.image = state.exercise.imageUrl ? {id:state.exercise.imageId,url:state.exercise.imageUrl,alt:state.exercise.imageAlt} : null; renderTrails(); renderEditor(); }
function newExercise() { if (!state.selectedUnit) return; state.exercise = normalizeExercise({ id:'Será criado ao salvar', kind:state.types[0]?.id || 'word_image_choose', instruction:'', choices:['','',''] }); state.image = null; renderTrails(); renderEditor(); $('#instruction-field').focus(); }
function renderEditor() { const visible = Boolean(state.exercise); $('#empty-editor').hidden = visible; $('#exercise-form').hidden = !visible; if (!visible) return; const ex = state.exercise; $('#exercise-location').textContent = state.selectedUnit?.title || ''; $('#editor-title').textContent = ex.id && ex.id !== 'Será criado ao salvar' ? 'Editar atividade' : 'Nova atividade'; renderKinds(); field('#id-field',ex.id); field('#instruction-field',ex.instruction); field('#tts-field',ex.ttsText); field('#word-field',ex.word); field('#answer-field',ex.answer); field('#masked-field',ex.maskedWord); field('#image-alt-field',ex.imageAlt); field('#difficulty-field',ex.difficulty); field('#positive-feedback-field',ex.positiveFeedback); field('#support-feedback-field',ex.supportFeedback); $('#retired-field').checked = !ex.retired; renderChoices(ex.choices); renderMedia(); renderPreview(); }
function collectExercise() { const ex = normalizeExercise(state.exercise); ex.kind = $('#kind-field').value; ex.instruction = $('#instruction-field').value.trim(); ex.ttsText = $('#tts-field').value.trim(); ex.word = $('#word-field').value.trim().toUpperCase(); ex.answer = $('#answer-field').value.trim().toUpperCase(); ex.maskedWord = $('#masked-field').value.trim().toUpperCase(); ex.choices = $$('.choice-value').map(node => node.value.trim().toUpperCase()).filter(Boolean); ex.imageId = state.image?.id || ex.imageId || ''; ex.imageUrl = state.image?.url || ex.imageUrl || ''; ex.imageAlt = $('#image-alt-field').value.trim(); ex.difficulty = Number($('#difficulty-field').value); ex.positiveFeedback = $('#positive-feedback-field').value.trim(); ex.supportFeedback = $('#support-feedback-field').value.trim(); ex.retired = !$('#retired-field').checked; return ex; }
function payload(ex) { return { id:ex.id === 'Será criado ao salvar' ? undefined : ex.id, unitId:state.selectedUnit.id, kind:ex.kind, instruction:ex.instruction, ttsText:ex.ttsText || null, word:ex.word || null, answer:ex.answer || null, maskedWord:ex.maskedWord || null, choices:ex.choices, imageId:ex.imageId || null, imageAlt:ex.imageAlt || null, difficulty:ex.difficulty, positiveFeedback:ex.positiveFeedback || null, supportFeedback:ex.supportFeedback || null, retired:ex.retired }; }
function renderPreview() { if (!state.exercise || !$('#exercise-form').checkValidity()) { $('#phone-content').innerHTML = '<p class="muted">Preencha os campos para visualizar.</p>'; return; } const ex = collectExercise(); const answers = ex.choices.slice(0,6).map(choice => `<span>${escapeHtml(choice)}</span>`).join('') || '<span>?</span><span>?</span><span>?</span>'; const shownWord = ex.maskedWord || ex.word || 'PALAVRA'; $('#phone-content').innerHTML = `<span class="eyebrow">ATIVIDADE</span><h3>${escapeHtml(ex.instruction || 'Sua instrução aparecerá aqui.')}</h3>${ex.imageUrl ? `<img class="preview-image" src="${escapeHtml(ex.imageUrl)}" alt="${escapeHtml(ex.imageAlt)}" />` : ''}<button class="speaker" type="button" aria-label="Ouvir instrução">◖))</button><p class="word">${escapeHtml(shownWord)}</p><div class="answers">${answers}</div>`; }
async function loadCatalog() { const [catalogResponse,typeResponse] = await Promise.all([request('/draft'),request('/types')]); state.draft = catalogResponse; state.catalog = normalizeCatalog(catalogResponse); state.types = items(typeResponse,'items','types','data'); $('#catalog-state').textContent = 'Rascunho local'; if (!state.selectedUnit) state.selectedUnit = state.catalog[0]?.units[0] || null; if (state.selectedUnit) { const found = state.catalog.flatMap(t => t.units).find(unit => unit.id === state.selectedUnit.id); state.selectedUnit = found || state.catalog[0]?.units[0]; } if (state.exercise && state.selectedUnit) state.exercise = state.selectedUnit.exercises.find(ex => ex.id === state.exercise.id) || state.selectedUnit.exercises[0] || null; else state.exercise = state.selectedUnit?.exercises[0] || null; renderTrails(); renderEditor(); }
function rawUnit(id) { return items(state.draft,'tracks','trails').flatMap(track => items(track,'units','modules')).find(unit => value(unit,'id') === id); }
function applyFields(target, ex) { target.type=ex.kind; target.item_kind=TYPE_TO_ITEM_KIND[ex.kind] || target.item_kind; target.instruction=ex.instruction; target.answer=ex.answer||target.answer; target.options=ex.choices; target.context_word=ex.word||target.context_word; target.tts_fallback_text=ex.ttsText||ex.instruction; if(['word_image_choose','syllable_position_choose'].includes(ex.kind)) target.target_id=ex.answer; target.payload={...(target.payload||{}),masked_word:ex.maskedWord||null,image_asset:ex.imageId||null,image_alt:ex.imageAlt||null,license:state.image?.license || target.payload?.license || null,attribution:state.image?.attribution || target.payload?.attribution || null,difficulty:ex.difficulty,positive_feedback:ex.positiveFeedback||null,support_feedback:ex.supportFeedback||null}; target.review_status=ex.retired?'retired':'approved'; }
async function saveExercise(event) { event.preventDefault(); const ex=collectExercise(); if(!ex.instruction)return toast('Escreva uma instrução antes de salvar.',true); $('#save-status').textContent='Salvando…'; try { const unit=rawUnit(state.selectedUnit.id), rawItems=items(unit,'items','exercises','activities'); let target=rawItems.find(item=>value(item,'id')===ex.id); if(!target){target={id:`item-${crypto.randomUUID()}`,position:rawItems.length+1,type:ex.kind,item_kind:ex.kind,options:[],payload:{}};rawItems.push(target);ex.id=target.id;} applyFields(target,ex); const result=await request('/draft',{method:'PUT',body:state.draft}); const issues=items(result,'errors','issues'); state.exercise=ex; $('#save-status').textContent=issues.length?`Rascunho salvo com ${issues.length} aviso(s).`:'Alterações salvas localmente.'; await loadCatalog(); toast(issues.length?'Rascunho salvo; corrija os avisos antes de publicar.':'Atividade salva.'); }catch(error){$('#save-status').textContent='';toast(message(error),true);} }
async function upload(file) { if (!file) return; const alt=$('#image-alt-field').value.trim(); if(!alt)return toast('Descreva a imagem antes de importá-la.',true); const form=new FormData();form.append('file',file);form.append('alt',alt);try{const result=await request('/assets/upload',{method:'POST',body:form});state.image={id:value(result,'id'),url:value(result,'url'),alt:value(result,'alt')||alt,license:value(result,'license'),attribution:value(result,'attribution')};state.exercise.imageId=state.image.id;state.exercise.imageUrl=state.image.url;state.exercise.imageAlt=state.image.alt;renderMedia();renderPreview();toast('Imagem importada para a biblioteca local.');}catch(error){toast(message(error),true);} }
async function importUrl() { const url=$('#image-url-field').value.trim(),alt=$('#image-alt-field').value.trim();if(!url)return toast('Informe a URL da imagem.',true);if(!alt)return toast('Descreva a imagem antes de importá-la.',true);try{const result=await request('/assets/import-url',{method:'POST',body:{url,alt,license:'Importada para uso acadêmico',attribution:url}});state.image={id:value(result,'id'),url:value(result,'url'),alt:value(result,'alt')||alt,license:value(result,'license'),attribution:value(result,'attribution')};state.exercise.imageId=state.image.id;state.exercise.imageUrl=state.image.url;state.exercise.imageAlt=state.image.alt;renderMedia();renderPreview();toast('Imagem importada e guardada localmente.');}catch(error){toast(message(error),true);} }
async function pasteImage() { try { const clipboard=await navigator.clipboard.read(); for(const entry of clipboard){const type=entry.types.find(type=>type.startsWith('image/'));if(type)return upload(await entry.getType(type));} toast('A área de transferência não contém uma imagem.',true); }catch{toast('O navegador não permitiu ler a área de transferência. Use Ctrl+V sobre a área de imagem.',true);} }
async function library() { const dialog=$('#media-dialog');dialog.showModal();const root=$('#media-library');root.innerHTML='<p class="muted">Carregando…</p>';try{const response=await request('/assets');const assets=items(response,'items','assets','data');root.replaceChildren();if(!assets.length)root.innerHTML='<p class="muted">Ainda não há imagens importadas nesta versão.</p>';for(const raw of assets){const id=value(raw,'id'),item={id,url:value(raw,'url') || `/v1/media/${id.replace(/^media\//,'')}`,alt:value(raw,'alt','image_alt'),license:value(raw,'license'),attribution:value(raw,'attribution'),name:id};const button=document.createElement('button');button.type='button';button.className='media-item';button.innerHTML=`<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.alt)}"/><span>${escapeHtml(item.name)}</span>`;button.onclick=()=>{state.image=item;state.exercise.imageId=item.id;state.exercise.imageUrl=item.url;state.exercise.imageAlt=item.alt;field('#image-alt-field',item.alt);dialog.close();renderMedia();renderPreview();};root.append(button);}}catch(error){root.innerHTML=`<p class="muted">${escapeHtml(message(error))}</p>`;} }
async function validateCatalog() { try { const result=await request('/validate',{method:'POST'}); const errors=items(result,'errors','issues','violations'); if(value(result,'valid','ok') === false || errors.length) { toast(`${errors.length || 1} problema(s): ${errors.slice(0,2).map(issue=>value(issue,'message','detail','rule')||String(issue)).join(' · ')}`,true); return false; } toast('Catálogo válido e pronto para publicar.'); return true; }catch(error){toast(message(error),true);return false;} }
async function publish(event) { event.preventDefault(); const note=$('#publish-note').value.trim(); try { const result=await request('/publish',{method:'POST',body:{notes:note}}); $('#publish-dialog').close(); $('#catalog-state').textContent=value(result,'etag','version','publishedAt','published_at')||'Publicado agora'; toast('Catálogo publicado e versão registrada.'); }catch(error){toast(message(error),true);} }
async function versions() { const dialog=$('#versions-dialog'); $('#versions-list').innerHTML='<p class="muted">Carregando…</p>';dialog.showModal(); try {const result=await request('/versions');const versions=Array.isArray(result)?result:items(result,'versions','items','data');const root=$('#versions-list');root.replaceChildren();if(!versions.length)root.innerHTML='<p class="muted">Nenhuma versão publicada ainda.</p>';for(const version of versions){const id=value(version,'id','versionId','version_id');const row=document.createElement('article');row.className='version';row.innerHTML=`<div><strong>${escapeHtml(value(version,'notes','note','label')||'Publicação sem nota')}</strong><small>${escapeHtml(value(version,'published_at','createdAt','created_at','date')||id)}</small></div><button type="button" class="secondary">Restaurar</button>`;$('button',row).onclick=async()=>{if(!confirm('Restaurar esta versão? Uma nova publicação será criada.'))return;try{await request(`/versions/${encodeURIComponent(id)}/restore`,{method:'POST',body:{notes:`Restauração da versão ${id}`}});dialog.close();await loadCatalog();toast('Versão restaurada e republicada.');}catch(error){toast(message(error),true);}};root.append(row);}}catch(error){$('#versions-list').innerHTML=`<p class="muted">${escapeHtml(message(error))}</p>`;} }
const DIFF_LABEL = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
const FEEDBACK_LABEL = { pending: 'Pendente', confirmed: 'Confirmado', corrected: 'Corrigido' };
state.wordsView = 'curriculum';
state.words = { items: [], counts: {}, total: 0 };

function showWorkspace(view) {
  state.wordsView = view;
  $('#curriculum-workspace').hidden = view !== 'curriculum';
  $('#words-workspace').hidden = view !== 'words';
  $('#nav-curriculum-button').setAttribute('aria-pressed', String(view === 'curriculum'));
  $('#nav-words-button').setAttribute('aria-pressed', String(view === 'words'));
  $('#validate-button').hidden = view !== 'curriculum';
  $('#publish-button').hidden = view !== 'curriculum';
  $('#versions-button').hidden = view !== 'curriculum';
  if (view === 'words') loadWords().catch(error => toast(message(error), true));
}

function badge(kind, text) { return `<span class="badge badge-${escapeHtml(kind)}">${escapeHtml(text)}</span>`; }

function renderWordsStats(counts = {}) {
  $('#words-stats').innerHTML = ['pending','confirmed','corrected'].map(key =>
    `<div class="words-stat"><strong>${counts[key] ?? 0}</strong><span class="muted">${FEEDBACK_LABEL[key]}</span></div>`
  ).join('');
}

function renderWordsTable(items) {
  const root = $('#words-table-wrap');
  if (!items.length) { root.innerHTML = '<p class="muted" style="padding:18px">Nenhuma palavra neste filtro.</p>'; return; }
  root.innerHTML = `<table class="words-table"><thead><tr>
    <th>Palavra</th><th>Sílabas</th><th>Modelo</th><th>Atual</th><th>Feedback</th><th>Fonte</th><th>Ações</th>
  </tr></thead><tbody></tbody></table>`;
  const body = $('tbody', root);
  for (const word of items) {
    const row = document.createElement('tr');
    const model = word.model_difficulty || '—';
    const current = word.current_difficulty || '—';
    const feedback = word.label_feedback || 'pending';
    row.innerHTML = `
      <td><strong>${escapeHtml(word.text)}</strong><br/><small>${escapeHtml(word.review_status || '')}</small></td>
      <td>${escapeHtml(word.syllables_text || (word.syllables || []).join('-'))}</td>
      <td>${model === '—' ? '—' : badge(model, DIFF_LABEL[model] || model)}</td>
      <td>${current === '—' ? '—' : badge(current, DIFF_LABEL[current] || current)}</td>
      <td>${badge(feedback, FEEDBACK_LABEL[feedback] || feedback)}</td>
      <td><small>${escapeHtml(word.source || '—')}</small></td>
      <td class="word-actions"></td>`;
    const actions = $('.word-actions', row);
    const confirmBtn = document.createElement('button');
    confirmBtn.type = 'button'; confirmBtn.className = 'primary'; confirmBtn.textContent = 'Confirmar modelo';
    confirmBtn.disabled = feedback === 'confirmed' && model === current;
    confirmBtn.onclick = () => sendFeedback(word.id, { verdict: 'confirm' });
    const fixSelect = document.createElement('select');
    fixSelect.setAttribute('aria-label', `Corrigir dificuldade de ${word.text}`);
    fixSelect.innerHTML = '<option value="">Corrigir para…</option>' +
      ['facil','medio','dificil'].map(d => `<option value="${d}">${DIFF_LABEL[d]}</option>`).join('');
    fixSelect.onchange = () => {
      if (!fixSelect.value) return;
      sendFeedback(word.id, { verdict: 'correct', difficulty: fixSelect.value });
    };
    const predictBtn = document.createElement('button');
    predictBtn.type = 'button'; predictBtn.className = 'secondary'; predictBtn.textContent = 'Reclassificar';
    predictBtn.onclick = () => repredictWord(word.id);
    actions.append(confirmBtn, fixSelect, predictBtn);
    body.append(row);
  }
}

async function loadWords() {
  const q = $('#words-search').value.trim();
  const feedback = $('#words-feedback-filter').value;
  const status = $('#words-status-filter').value;
  const params = new URLSearchParams({ limit: '100' });
  if (q) params.set('q', q);
  if (feedback) params.set('feedback', feedback);
  if (status) params.set('status', status);
  $('#words-table-wrap').innerHTML = '<p class="muted" style="padding:18px">Carregando…</p>';
  const result = await request(`/words?${params}`);
  state.words = result;
  renderWordsStats(result.counts || {});
  renderWordsTable(items(result, 'items'));
  $('#catalog-state').textContent = `${result.total || 0} palavras no banco`;
}

async function sendFeedback(id, body) {
  try {
    await request(`/words/${encodeURIComponent(id)}/feedback`, { method: 'POST', body });
    toast(body.verdict === 'confirm' ? 'Predição confirmada para o treino.' : 'Correção registrada para o treino.');
    await loadWords();
  } catch (error) { toast(message(error), true); }
}

async function repredictWord(id) {
  try {
    await request(`/words/${encodeURIComponent(id)}/predict`, { method: 'POST' });
    toast('Modelo reaplicado nesta palavra.');
    await loadWords();
  } catch (error) { toast(message(error), true); }
}

async function addWord(event) {
  event.preventDefault();
  const text = $('#new-word-text').value.trim();
  const syllables = $('#new-word-syllables').value.trim();
  const frequency = Number($('#new-word-frequency').value || 0.5);
  if (!text) return toast('Informe a palavra.', true);
  try {
    const created = await request('/words', { method: 'POST', body: { text, syllables: syllables || null, frequency } });
    toast(`Palavra ${created.text} classificada como ${DIFF_LABEL[created.model_difficulty] || created.model_difficulty}.`);
    event.currentTarget.reset();
    $('#new-word-frequency').value = '0.5';
    await loadWords();
  } catch (error) { toast(message(error), true); }
}

async function exportLabels() {
  try {
    const result = await request('/words/export-labels');
    const blob = new Blob([JSON.stringify(result.items || [], null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'difficulty_labels_human.json';
    anchor.click();
    URL.revokeObjectURL(url);
    toast(`${result.count || 0} rótulo(s) exportado(s) para retreino.`);
  } catch (error) { toast(message(error), true); }
}

async function init() { try { const session=await request('/setup/status'); const configured=Boolean(value(session,'configured','isConfigured','is_configured')); const authenticated=Boolean(localStorage.getItem('alfabetiza-admin-access')); $('#auth-view').hidden=authenticated;$('#studio-view').hidden=!authenticated; if(!authenticated){$('#auth-copy').textContent=configured?'Entre com a conta local do administrador.':'Crie a única conta administrativa local.';$('#auth-form').dataset.mode=configured?'login':'setup';return;} showWorkspace('curriculum'); await loadCatalog(); }catch(error){$('#auth-view').hidden=false;$('#studio-view').hidden=true;$('#auth-copy').textContent='O painel não encontrou a API local. Inicie o servidor e tente novamente.';toast(message(error),true);} }
$('#auth-form').addEventListener('submit',async event=>{event.preventDefault();const form=new FormData(event.currentTarget),data=Object.fromEntries(form);const email=String(data.email||'').trim(),password=String(data.password||'');if(!email||!email.includes('@'))return toast('Informe um e-mail válido.',true);if(password.length<8)return toast('A senha precisa ter pelo menos 8 caracteres.',true);data.email=email;data.password=password;try{const tokens=await request(event.currentTarget.dataset.mode==='login'?'/login':'/setup',{method:'POST',body:{email,password}});localStorage.setItem('alfabetiza-admin-access',tokens.access_token);localStorage.setItem('alfabetiza-admin-refresh',tokens.refresh_token);await init();}catch(error){toast(message(error),true);}});
$('#exercise-form').addEventListener('submit',saveExercise);$('#kind-field').addEventListener('change',()=>{updateKindHelp();renderPreview();});$('#exercise-form').addEventListener('input',event=>{if(event.target.matches('input,textarea,select'))renderPreview();});$('#new-exercise-button').onclick=newExercise;$('#add-choice-button').onclick=()=>addChoice();$('#preview-button').onclick=()=>{$('#preview-panel').classList.add('open');renderPreview();};$('#close-preview-button').onclick=()=>$('#preview-panel').classList.remove('open');$('#upload-button').onclick=()=>$('#image-file-field').click();$('#image-file-field').onchange=event=>upload(event.target.files[0]);$('#paste-button').onclick=pasteImage;$('#import-url-button').onclick=importUrl;$('#library-button').onclick=library;$('#validate-button').onclick=validateCatalog;$('#publish-button').onclick=async()=>{if(await validateCatalog())$('#publish-dialog').showModal();};$('#publish-form').onsubmit=publish;$('#versions-button').onclick=versions;$('#reload-button').onclick=()=>loadCatalog().catch(error=>toast(message(error),true));$('#logout-button').onclick=()=>{localStorage.removeItem('alfabetiza-admin-access');localStorage.removeItem('alfabetiza-admin-refresh');location.reload();};$$('[data-close-dialog]').forEach(button=>button.onclick=()=>button.closest('dialog').close());
$('#nav-curriculum-button').onclick=()=>showWorkspace('curriculum');
$('#nav-words-button').onclick=()=>showWorkspace('words');
$('#words-reload-button').onclick=()=>loadWords().catch(error=>toast(message(error),true));
$('#words-export-button').onclick=()=>exportLabels();
$('#words-add-form').addEventListener('submit', addWord);
$('#words-search').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); loadWords().catch(error => toast(message(error), true)); } });
$('#words-feedback-filter').onchange=()=>loadWords().catch(error=>toast(message(error),true));
$('#words-status-filter').onchange=()=>loadWords().catch(error=>toast(message(error),true));
document.addEventListener('paste',event=>{if(!state.exercise)return;const file=[...event.clipboardData.files].find(f=>f.type.startsWith('image/'));if(file){event.preventDefault();upload(file);}});$('#image-preview').addEventListener('dragover',event=>{event.preventDefault();event.currentTarget.style.borderColor='var(--green)';});$('#image-preview').addEventListener('dragleave',event=>event.currentTarget.style.borderColor='');$('#image-preview').addEventListener('drop',event=>{event.preventDefault();event.currentTarget.style.borderColor='';upload([...event.dataTransfer.files].find(file=>file.type.startsWith('image/')));});
init();

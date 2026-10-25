/* عبّي تحضير نور v2 — أ. رشدي سيد
   ضغطة واحدة: يقرأ عنوان الدرس المختار، يلاقيه في البنك، ويعبّي.
   الزر الصغير: البنك مش جوه filler.js — بيحمّل banks/<المسار>.js للصف اللي في الصفحة بس.
   الزر الكامل: البنك كله مدمج (EMBED). */
(function () {
  var EMBED = __BANK__, AVAIL = __AVAIL__, VER = '__VER__', CURR = __CURR__, TOOL = 'https://claude.ai/artifact/JiKpt7g2M2EawHpdBcZMXH';
  var BASE = ((document.currentScript && document.currentScript.src) || '').replace(/[^\/]*$/, '') || 'https://roshdy1221985.github.io/noor-filler/';
  var $ = window.jQuery, CK = window.CKEDITOR;
  function trackName(t) { var g = CURR.filter(function (g) { return g.t === t; })[0]; return g ? 'الصف ' + g.n : t; }
  /* يحمّل بنوك المسارات المطلوبة (اللي ليها ملف بس) وبعدين cb(الدروس) */
  function loadBank(tracks, cb) {
    tracks = tracks.filter(function (t) { return AVAIL.indexOf(t) > -1; });
    if (EMBED) return cb(EMBED.filter(function (l) { return tracks.indexOf(l.track) > -1; }));
    var W = window.NOOR_BANK = window.NOOR_BANK || {}, left = tracks.filter(function (t) { return !W[t]; }), n = left.length, bad = false;
    var done = function () { cb([].concat.apply([], tracks.map(function (t) { return W[t] || []; }))); };
    if (!n) return done();
    left.forEach(function (t) {
      var s = document.createElement('script'); s.src = BASE + 'banks/' + t + '.js?v=' + Date.now();
      s.onload = function () { if (!--n && !bad) done(); };
      s.onerror = function () { if (!bad) { bad = true; alert('مقدرتش أحمّل بنك ' + trackName(t) + ' من GitHub (النت أو منصة نور مانعة التحميل).\nاستخدم «الزر الكامل» من صفحة التركيب.'); } };
      document.head.appendChild(s);
    });
  }
  /* يسأل المعلم يختار الصف — list: أكواد المسارات، def: المقترح */
  function pickTrack(msg, list, def) {
    var i = list.indexOf(def);
    var pick = prompt(msg + '\n' + list.map(function (t, k) { return (k + 1) + ') ' + trackName(t) + (AVAIL.indexOf(t) > -1 ? '' : '  (لسه مفيش تحضير جاهز)'); }).join('\n'), String(i > -1 ? i + 1 : 1));
    if (!pick) return null;
    return list[parseInt(String(pick).replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }), 10) - 1] || null;
  }
  /* ===== وضع الواجب: صفحة «إضافة مجموعة مفردات دفعة واحدة» ===== */
  function homeworkMode() {
    if (!AVAIL.length) return alert('مفيش واجبات في البنك لسه.');
    var t = AVAIL.length === 1 ? AVAIL[0] : pickTrack('اختار الصف:', AVAIL, detectTrack());
    if (!t) return;
    loadBank([t], homeworkFill);
  }
  function homeworkFill(BANK) {
    var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
    var log = [], fail = null;
    var withHw = BANK.filter(function (l) { return l.homework && l.homework.length; });
    if (!withHw.length) return alert('مفيش واجبات في البنك لسه.');
    var pick = prompt('اختار رقم الدرس:\n' + withHw.map(function (l, i) { return (i + 1) + ') ' + l.grade + ' — ' + l.lesson; }).join('\n'), '1');
    if (!pick) return;
    var L = withHw[+pick - 1]; if (!L) return alert('رقم غلط.');
    var N = L.homework.length, want = prompt('كام سؤال؟ (المتاح ' + N + ' — من السهل للصعب)', String(Math.min(6, N)));
    if (!want) return; want = Math.max(1, Math.min(N, parseInt(String(want).replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }), 10) || 6));
    var pools = [1, 2, 3].map(function (lv) { return L.homework.filter(function (h) { return (h.level || 1) === lv; }).sort(function () { return Math.random() - .5; }); });
    var chosen = []; for (var r = 0; chosen.length < want; r = (r + 1) % 3) { if (pools[r].length) chosen.push(pools[r].shift()); else if (!pools.some(function (p) { return p.length; })) break; }
    chosen.sort(function (a, b) { return (a.level || 1) - (b.level || 1); });
    L = { lesson: L.lesson, homework: chosen };
    var visible = function (e) { if (!e || !e.getClientRects().length) return false; var cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none'; };
    var table = [].slice.call(document.querySelectorAll('table')).filter(function (t) { return /الإختيارات|الاختيارات/.test(t.textContent); })[0];
    if (!table) return alert('مش لاقي جدول المفردات.');
    var heads = [].slice.call(table.querySelectorAll('thead th, tr:first-child th')).map(function (th) { return th.textContent.replace(/\s+/g, ' ').trim(); });
    var col = function (re) { for (var i = 0; i < heads.length; i++) if (re.test(heads[i])) return i; return -1; };
    var C = { deg: col(/الدرجة/), text: col(/^النص/), ans: col(/الجواب/), cnt: col(/عدد/), opt1: col(/خيار\s*1|خيار\s*١/) };
    var btn = function (re) { return [].slice.call(document.querySelectorAll('a,button')).filter(function (b) { return re.test(b.textContent) && visible(b); })[0]; };
    var setVal = function (el, v) {
      var proto = el.tagName === 'SELECT' ? HTMLSelectElement.prototype : el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
      ['input', 'change', 'keyup', 'blur'].forEach(function (ev) { el.dispatchEvent(new Event(ev, { bubbles: true })); });
      if (window.jQuery) jQuery(el).trigger('change');
    };
    var field = function (td) { return td && td.querySelector('input:not([type=hidden]):not([type=checkbox]),select,textarea'); };
    function shuffle(q) {
      var o = q.options.map(function (t, i) { return { t: t, ok: i === q.answer - 1 }; });
      for (var i = o.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = o[i]; o[i] = o[j]; o[j] = x; }
      return o;
    }
    async function writeText(tr, html, plain) {
      var td = tr.cells[C.text];
      var inline = td.querySelector('textarea,input:not([type=hidden]),[contenteditable=true]');
      if (inline) { inline.isContentEditable ? (inline.innerHTML = html) : setVal(inline, plain); return 'inline'; }
      var ck0 = window.CKEDITOR ? Object.keys(CKEDITOR.instances) : [];
      var link = td.querySelector('a,span,button,[onclick]') || td; link.click();
      for (var t = 0; t < 30; t++) {
        await sleep(150);
        var modal = [].slice.call(document.querySelectorAll('.modal,[role=dialog],.swal2-popup')).filter(visible).pop();
        if (!modal) continue;
        await sleep(400);
        var ckNew = window.CKEDITOR ? Object.keys(CKEDITOR.instances).filter(function (k) { return ck0.indexOf(k) < 0 || modal.contains(CKEDITOR.instances[k].container && CKEDITOR.instances[k].container.$); }) : [];
        var ed = ckNew.length ? CKEDITOR.instances[ckNew[ckNew.length - 1]] : null;
        if (ed) { ed.setData(html); await sleep(500); var got = ed.getData(); if (/<math/.test(html) && !/Wirisformula|<math|data-mathml/i.test(got)) { ed.setData(plain); await sleep(200); } ed.updateElement(); }
        else {
          var box = [].slice.call(modal.querySelectorAll('textarea,[contenteditable=true],input[type=text]')).filter(visible)[0];
          if (!box) return 'لقيت النافذة بس مفيش فيها خانة كتابة';
          box.isContentEditable ? (box.innerHTML = html) : setVal(box, plain);
        }
        await sleep(200);
        var ok = [].slice.call(modal.querySelectorAll('button,a,input[type=button],input[type=submit]')).filter(function (b) { return visible(b) && /حفظ|تم|موافق|إضافة|اعتماد|تأكيد|save|ok|done/i.test(b.textContent || b.value); })[0];
        if (!ok) return 'كتبت السؤال بس مش لاقي زر الحفظ في النافذة';
        ok.click();
        for (var w = 0; w < 20 && visible(modal); w++) await sleep(150);
        return 'modal';
      }
      return 'دوست «نص المفردة» ومفيش نافذة اتفتحت';
    }
    (async function () {
      for (var n = 0; n < L.homework.length; n++) {
        var q = L.homework[n], before = table.querySelectorAll('tbody tr').length;
        var add = btn(q.type === 'tf' ? /صح\s*\/\s*خطأ/ : /متعدد الاختيارات/);
        if (!add) { fail = 'مش لاقي زر إضافة ' + q.type; break; }
        add.click(); await sleep(500);
        var rows = table.querySelectorAll('tbody tr'); if (rows.length <= before) { fail = 'دوست الإضافة ومفيش صف جديد ظهر'; break; }
        var tr = rows[rows.length - 1];
        var deg = field(tr.cells[C.deg]); if (deg) setVal(deg, String(q.degree || 1));
        if (q.type === 'tf') {
          var s = field(tr.cells[C.ans]);
          var o = s && [].find.call(s.options, function (x) { return (q.answer ? /صحيح|صح/ : /خطأ|خاطئ/).test(x.text); });
          if (o) setVal(s, o.value); else { fail = 'سؤال ' + (n + 1) + ': مش لاقي اختيار صحيح/خطأ'; break; }
        } else {
          var sh = shuffle(q), cnt = field(tr.cells[C.cnt]);
          if (cnt && cnt.tagName === 'SELECT') { setVal(cnt, String(sh.length)); await sleep(250); }
          for (var k = 0; k < sh.length; k++) { var f = field(tr.cells[C.opt1 + k]); if (f) setVal(f, sh[k].t); else { fail = 'سؤال ' + (n + 1) + ': مش لاقي خانة خيار ' + (k + 1); break; } }
          if (fail) break;
          await sleep(250);
          var a = field(tr.cells[C.ans]), right = sh.findIndex(function (x) { return x.ok; }) + 1;
          var ao = a && ([].find.call(a.options, function (x) { return x.value === String(right) || x.text.trim() === String(right); }) ||
                         [].find.call(a.options, function (x) { return x.text.trim() === sh[right - 1].t; }) ||
                         [].filter.call(a.options, function (x) { return x.value !== ''; })[right - 1]);
          if (ao) setVal(a, ao.value); else { fail = 'سؤال ' + (n + 1) + ': مش عارف أحدد الجواب الصحيح'; break; }
        }
        var r = await writeText(tr, q.html || q.text, q.text);
        if (r !== 'modal' && r !== 'inline') { fail = 'سؤال ' + (n + 1) + ': ' + r; break; }
        log.push(n + 1);
      }
      if (fail) {
        var rep = JSON.stringify({ fail: fail, heads: heads, C: C, row: (table.querySelector('tbody tr:last-child') || {}).outerHTML && table.querySelector('tbody tr:last-child').outerHTML.slice(0, 3000),
          modals: [].slice.call(document.querySelectorAll('.modal,[role=dialog]')).slice(0, 3).map(function (m) { return m.outerHTML.slice(0, 2500); }) });
        var ta = document.createElement('textarea'); ta.value = rep; document.body.appendChild(ta); ta.select(); var c = false; try { c = document.execCommand('copy'); } catch (e) {} ta.remove();
        alert('⚠ وقفت عند: ' + fail + '\nاتعبّى: ' + (log.length ? log.join('، ') : 'لا شيء') + (c ? '\n\nاتنسخ تقرير — الصقه لClaude عشان يصلّح.' : ''));
      } else alert('✔ اتعبّت ' + log.length + ' أسئلة لـ «' + L.lesson + '».\nالاختيارات اتلخبطت عشوائيًا.\nراجع وبعدين دوس «إنشاء المفردات».');
    })();
  }
  if (/add_bulk_questions/.test(location.pathname)) return homeworkMode();
  if (!document.getElementById('add_preparation_form')) return alert('افتح صفحة «إضافة تحضير» في منصة نور الأول.');
  if (!$ || !CK) return alert('الصفحة لسه بتحمّل. استنى ثواني وجرّب تاني.');

  function norm(s) {
    return String(s || '').replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); })
      .replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/[^\u0621-\u064A0-9]/g, '');
  }
  function nums(s) { return (String(s).replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).match(/\d+/g) || []).slice(0, 2).sort().join(','); }

  function detectTrack() {
    var p = norm(document.body.innerText);
    var ord = [['ثانيعشر', '12'], ['حاديعشر', '11'], ['عاشر', '10'], ['تاسع', '09'], ['ثامن', '08'], ['سابع', '07'], ['سادس', '06'], ['خامس', '05']];
    for (var i = 0; i < ord.length; i++) {
      var k = p.search(new RegExp('صف(ال)?' + ord[i][0]));
      if (k < 0) continue;
      var g = ord[i][1];
      if (g === '11' || g === '12') { var win = p.slice(Math.max(0, k - 60), k + 40); return 'g' + g + (/متقدم/.test(win) ? 'a' : /اساس/.test(win) ? 'b' : ''); }
      return 'g' + g;
    }
    return null;
  }
  function score(name, t, tn) {
    var n = norm(String(name).replace(/^[\s٠-٩0-9\-–()أبجـد]+(?=\s)/, ''));
    return (n && (t.indexOf(n) > -1 || n.indexOf(t.replace(/^\d+/, '')) > -1) ? 3 : 0) + (tn && nums(name) === tn ? 1 : 0);
  }
  var titleEl = document.getElementById('PreparationTitle'), title = titleEl ? titleEl.value.trim() : '';
  if (!title) return alert('اختار الدرس من الشجرة الأول، وبعدين دوس الزر.');
  var track = detectTrack(), tracks = track && (track.length === 3 ? CURR.map(function (g) { return g.t; }).filter(function (x) { return x.indexOf(track) === 0; }) : [track]);
  if (!tracks) { track = pickTrack('مش لاقي اسم الصف في الصفحة. اختار الصف:', CURR.map(function (g) { return g.t; }), null); if (!track) return; tracks = [track]; }
  loadBank(tracks, main);
  function main(BANK) {
  var t = norm(title), tn = nums(title), d = null;
  var hits = BANK.filter(function (l) { return !track || !l.track || l.track === track || (track.length === 3 && l.track.indexOf(track) === 0); })
    .map(function (l) { return { l: l, sc: score(l.lesson, t, tn) }; }).filter(function (h) { return h.sc >= 3; }).sort(function (a, b) { return b.sc - a.sc; });
  if (hits.length > 1 && hits[0].sc === hits[1].sc) {
    var pick = prompt('لقيت أكتر من تحضير للدرس ده. اكتب رقم اللي تحبه:\n' + hits.map(function (h, i) { return (i + 1) + ') ' + h.l.grade + ' — ' + h.l.lesson; }).join('\n'), '1');
    if (!pick) return; d = (hits[+pick - 1] || {}).l;
  } else if (hits.length) d = hits[0].l;
  if (!d) {
    // مش في البنك: نلاقي الدرس في خريطة المنهج ونفتح مساعد التحضير عليه
    var best = null;
    CURR.forEach(function (g) { if (track && g.t !== track && !(track.length === 3 && g.t.indexOf(track) === 0)) return;
      g.s.forEach(function (sm, si) { sm.u.forEach(function (u, ui) { u.l.forEach(function (ln, li) {
        var sc = score(ln, t, tn); if (sc >= 3 && (!best || sc > best.sc)) best = { sc: sc, tok: g.t + '-' + (si + 1) + '-' + (ui + 1) + '-' + (li + 1), name: 'الصف ' + g.n + ' — ' + ln };
      }); }); }); });
    var outs = [].slice.call(document.querySelectorAll('#criteria-checkbox input[name^="Preparation[criteria]["]')).map(function (cb) { return ((cb.closest('label') || cb.parentNode).textContent || '').replace(/\s+/g, ' ').trim(); }).filter(Boolean);
    var copied = false;
    if (outs.length) { var ta = document.createElement('textarea'); ta.value = outs.map(function (o, i) { return (i + 1) + ') ' + o; }).join('\n'); document.body.appendChild(ta); ta.select(); try { copied = document.execCommand('copy'); } catch (e) {} ta.remove(); }
    if (best && confirm('«' + best.name + '»\nلسه مفيش تحضير جاهز للدرس ده في الزر.\n\nOK = افتح مساعد التحضير وحضّره بالذكاء الاصطناعي' + (copied ? '\n(المخرجات اتنسخت — الصقها هناك بـ Ctrl+V)' : '') + '\nCancel = عندي كود جاهز ألصقه')) { window.open(TOOL + '#' + best.tok, '_blank'); return; }
  }
  if (!d) {
    var raw = prompt('الصق كود التحضير (JSON) من مساعد التحضير:');
    if (!raw) return;
    raw = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    try { d = JSON.parse(raw); } catch (e) { return alert('الكود ده مش سليم.'); }
  }

  var report = [], warn = [];
  var obj = document.getElementById('PreparationObjective');
  if (obj && d.extra_objective) { obj.value = d.extra_objective; $(obj).trigger('input').trigger('change'); report.push('الهدف'); }
  var boxes = [].slice.call(document.querySelectorAll('#criteria-checkbox input[name^="Preparation[criteria]["]'));
  if (d.criteria && boxes.length) {
    var n = 0;
    boxes.forEach(function (cb, i) {
      var txt = (cb.closest('label') || cb.parentNode).textContent || '';
      var hit = d.criteria === 'all' || ([].concat(d.criteria).some(function (c) { return typeof c === 'number' ? c === i + 1 : txt.indexOf(String(c)) > -1; }));
      if (hit && !cb.checked) { cb.checked = true; $(cb).trigger('change'); n++; }
    });
    report.push('المخرجات (' + n + ')');
  } else if (d.criteria) warn.push('المخرجات مش ظاهرة — علّمها بإيدك.');
  [['taxonomies', 'المستوى'], ['strategies', 'الاستراتيجيات'], ['teaching_aids', 'المصادر']].forEach(function (p) {
    var sel = document.getElementById(p[0]), want = d[p[0]];
    if (!sel || !Array.isArray(want)) return;
    var miss = [];
    want.forEach(function (w) { w = String(w).trim(); var o = [].find.call(sel.options, function (o) { return o.value === w || o.text.trim() === w; }); if (o) o.selected = true; else miss.push(w); });
    $(sel).trigger('chosen:updated').trigger('change'); report.push(p[1]);
    if (miss.length) warn.push(p[1] + ': مش موجود ← ' + miss.join('، '));
  });
  var names = Object.keys(CK.instances);
  function byLabel(w) { return names.filter(function (k) { var el = CK.instances[k].element && CK.instances[k].element.$; var b = el && (el.closest('.form-group') || el.parentNode); var lb = b && b.querySelector('label'); return lb && lb.textContent.indexOf(w) > -1; })[0]; }
  [['concepts_html', 'lesson_vocabulary', null, 0, 'المفاهيم'], ['warmup_html', 'description', null, 1, 'التهيئة'], ['procedures_html', 'thinking_skills', null, 2, 'سير الدرس'],
   ['formative_html', null, 'التكويني', 3, 'التقويم التكويني'], ['final_html', null, 'الختامي', 4, 'التقويم الختامي']].forEach(function (m) {
    if (!d[m[0]]) return;
    var k = (m[1] && CK.instances[m[1]]) ? m[1] : (m[2] && byLabel(m[2])) || names[m[3]];
    if (k && CK.instances[k]) { CK.instances[k].setData(d[m[0]]); CK.instances[k].updateElement(); report.push(m[4]); } else warn.push('مش لاقي ' + m[4]);
  });
  alert('✔ ' + (d.lesson ? '«' + d.lesson + '»\n' : '') + 'اتعبّى: ' + report.join('، ') + (warn.length ? '\n\n⚠ راجع:\n- ' + warn.join('\n- ') : '') + '\n\nراجع قبل الحفظ.  (بنك ' + VER + ')');
  }
})();

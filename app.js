/* ===== 婚礼邀请函 · 纯前端版 v3 =====
 * 数据来源：./wedding.json（file:// 本地打开时自动降级读 ./wedding.json.js）
 * 回执存储：浏览器 localStorage（本机暂存）
 * 汇总闭环：wedding.json 里的 guests 数组是"正式名单"。
 *   亲友提交 -> 存本人浏览器；你在收过回执的设备打开 链接#admin，
 *   面板会把"正式名单 + 本机回执"合并，一键生成新的 wedding.json 全文，
 *   粘贴回仓库覆盖推送 = 完成一次"改文件即汇总"。
 */
(function () {
  'use strict';

  var GUEST_KEY = 'wedding:guests';
  var data = null;

  /* ---------- 读取数据 ---------- */
  function loadWedding() {
    return new Promise(function (resolve, reject) {
      if (window.WEDDING_DATA) { resolve(window.WEDDING_DATA); return; }
      fetch('./wedding.json', { cache: 'no-store' })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        })
        .then(resolve)
        .catch(function (e) {
          if (window.WEDDING_DATA) resolve(window.WEDDING_DATA);
          else reject(e);
        });
    });
  }

  /* ---------- 小工具 ---------- */
  function $(id) { return document.getElementById(id); }
  function setText(id, v) { var el = $(id); if (el && v != null) el.textContent = v; }
  function setImg(id, src) { var el = $(id); if (el && src) el.src = src; }
  function setHtml(id, v) { var el = $(id); if (el && v != null) el.innerHTML = v; }
  function lines(arr) { return (arr || []).join('<br>'); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* ---------- 数据层：json 正式名单 + 本机 localStorage，按手机号去重 ---------- */
  function localGuests() {
    try { return JSON.parse(localStorage.getItem(GUEST_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function saveGuest(g) {
    var list = localGuests();
    for (var i = 0; i < list.length; i++) {
      if (String(list[i].phone) === String(g.phone)) { list[i] = g; localStorage.setItem(GUEST_KEY, JSON.stringify(list)); return list; }
    }
    list.push(g);
    localStorage.setItem(GUEST_KEY, JSON.stringify(list));
    return list;
  }
  function officialGuests() { return (data && data.guests) || []; }
  function mergedGuests() {
    var index = {}, out = [];
    officialGuests().forEach(function (g) {
      var item = Object.assign({}, g); delete item.source;
      item.source = 'json';
      index[String(g.phone)] = item; out.push(item);
    });
    localGuests().forEach(function (g) {
      var k = String(g.phone);
      if (index[k]) {
        var merged = Object.assign({}, g, { source: 'both' });
        var pos = out.indexOf(index[k]);
        out[pos] = merged; index[k] = merged;
      } else {
        var item = Object.assign({}, g); delete item.source;
        item.source = 'local';
        index[k] = item; out.push(item);
      }
    });
    return out;
  }
  function stats() {
    var list = mergedGuests(), totalGuests = 0;
    list.forEach(function (g) { totalGuests += Number(g.count) || 0; });
    return { totalGuests: totalGuests, totalAttendees: list.length };
  }
  function maskPhone(p) {
    p = String(p || '');
    return p.length === 11 ? p.slice(0, 3) + '****' + p.slice(7) : p;
  }
  window.WeddingData = {
    getGuests: mergedGuests,
    localGuests: localGuests,
    officialGuests: officialGuests,
    saveGuest: saveGuest,
    stats: stats
  };

  /* ---------- 渲染页面 ---------- */
  function render(d) {
    if (d.share) {
      var map = { 'og:title': d.share.ogTitle, 'og:description': d.share.ogDescription, 'og:image': d.share.ogImage };
      Object.keys(map).forEach(function (k) {
        var m = document.querySelector('meta[property="' + k + '"]');
        if (m && map[k]) m.setAttribute('content', map[k]);
      });
      if (d.share.pageTitle) document.title = d.share.pageTitle;
    }

    var couple = d.couple || {}, ev = d.event || {}, venue = d.venue || {},
        media = d.media || {}, copy = d.copy || {};

    setText('coverTag', copy.coverTag);
    setHtml('coverNames', couple.display || (couple.groom + ' & ' + couple.bride));
    setText('coverSub', copy.coverSub);
    setText('coverDate', ev.coverDate);
    setImg('coverBgImg', media.coverBg);

    setImg('vinylImg', media.vinyl);
    setText('vinylScript', copy.vinylScript);
    setText('vinylPoem', copy.vinylPoem);
    setText('playerName', copy.playerName);
    setImg('playerImg', media.player);

    setHtml('invNames', couple.display);
    setHtml('poemOne', lines(copy.poemOne));
    setImg('photo1', media.photo1);

    setText('withYouScript', copy.withYouScript);
    setHtml('poemTwo', lines(copy.poemTwo));
    setHtml('invitation', lines(copy.invitation));
    setImg('gridLeft', media.gridLeft);
    setImg('gridRight', media.gridRight);

    setText('countLine', copy.countLine);
    setText('countNote', copy.countNote);
    setImg('photo2', media.photo2);

    setText('calMonth', ev.month);
    setText('calDay', ev.day);
    setText('calYear', '-' + ev.year + '-');
    renderCalendar(ev.year, ev.month, ev.day);
    setText('lunarText', ev.lunar);

    setText('tipsTitle', copy.tipsTitle);
    var ul = $('tipsList');
    if (ul) {
      ul.innerHTML = '';
      (copy.tips || []).forEach(function (t) {
        var li = document.createElement('li'); li.textContent = t; ul.appendChild(li);
      });
    }
    var call = $('callList');
    if (call) {
      call.innerHTML = '';
      (d.contacts || []).forEach(function (c) {
        var a = document.createElement('a');
        a.href = 'tel:' + c.tel;
        a.textContent = '✆ ' + c.label;
        call.appendChild(a);
      });
    }
    setImg('photo3', media.photo3);

    setHtml('thanksLines', lines(copy.thanksLines));
    setText('seeYou', copy.seeYou);

    var sel = $('count2');
    if (sel) {
      sel.innerHTML = '';
      var op0 = document.createElement('option');
      op0.value = ''; op0.disabled = true; op0.selected = true; op0.textContent = '* 出席人数';
      sel.appendChild(op0);
      ((d.rsvp && d.rsvp.countOptions) || [1,2,3,4,5,6,7,8]).forEach(function (n) {
        var o = document.createElement('option'); o.value = n; o.textContent = n + ' 人'; sel.appendChild(o);
      });
    }

    var sec = $('cardPhotoSection');
    if (sec && media.cardCover) sec.style.backgroundImage = 'url(' + media.cardCover + ')';
    setText('dateMain', ev.dateMain);
    setText('dateSub', ev.lunar);
    var nav = $('navBtn'), link = $('venueLink');
    if (nav) nav.href = venue.navUrl || '#';
    if (link) {
      link.href = venue.navUrl || '#';
      link.innerHTML = '点击导航至：' + venue.name + '<br>（' + venue.detail + '）';
    }
    setText('footer', copy.footer);

    var bgm = $('bgm');
    if (bgm && media.music) bgm.src = media.music;

    return ev.startISO;
  }

  /* ---------- 动态日历 ---------- */
  function renderCalendar(year, month, day) {
    var table = $('calTable');
    if (!table || !year) return;
    var first = new Date(year, month - 1, 1);
    var startWeekday = (first.getDay() + 6) % 7;
    var daysInMonth = new Date(year, month, 0).getDate();
    var prevDays = new Date(year, month - 1, 0).getDate();

    var html = '<tr><th>MON</th><th>TUE</th><th>WED</th><th>THU</th><th>FRI</th><th>SAT</th><th>SUN</th></tr>';
    var cell = 1, prev = prevDays - startWeekday + 1, done = false;
    for (var w = 0; w < 6 && !done; w++) {
      html += '<tr>';
      for (var wd = 0; wd < 7; wd++) {
        var idx = w * 7 + wd;
        if (idx < startWeekday) {
          html += '<td class="dim">' + prev + '</td>'; prev++;
        } else if (cell > daysInMonth) {
          html += '<td class="dim"></td>';
        } else {
          if (cell === day) {
            html += '<td class="mark"><span>' + cell + '</span></td>';
          } else {
            html += '<td>' + cell + '</td>';
          }
          cell++;
        }
      }
      html += '</tr>';
      if (cell > daysInMonth) done = true;
    }
    table.innerHTML = html;
  }

  /* ---------- 复制文本（兼容 clipboard API 与旧浏览器） ---------- */
  function copyText(txt, btn) {
    function done() {
      var old = btn.textContent;
      btn.textContent = '已复制';
      setTimeout(function () { btn.textContent = old; }, 1500);
    }
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = txt;
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); }
      catch (e) { window.prompt('手动复制以下内容：', txt); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done).catch(fallback);
    } else fallback();
  }

  /* ---------- 管理面板：链接#admin 打开 ---------- */
  function renderAdmin(d) {
    var hashKey = (d.rsvp && d.rsvp.adminHash) || 'admin';
    if (location.hash.replace(/^#/, '') !== hashKey) return;

    var panel = document.createElement('div');
    panel.id = 'adminPanel';
    panel.style.cssText = 'max-width:480px;margin:0 auto;padding:22px 16px 46px;background:#23262b;color:#e8e8e8;font-size:13px;line-height:1.8;';
    document.body.appendChild(panel);

    var srcNames = { json: '正式', local: '本机', both: '本机已更新' };

    function buildJsonText(useMask) {
      var list = mergedGuests().map(function (g) {
        var item = {
          name: g.name,
          phone: useMask ? maskPhone(g.phone) : g.phone,
          count: Number(g.count) || 0
        };
        if (g.createdAt) item.createdAt = g.createdAt;
        return item;
      });
      var exportData = Object.assign({}, d, { guests: list });
      return JSON.stringify(exportData, null, 2);
    }

    function refresh() {
      var list = mergedGuests();
      var st = stats();
      var html = '';
      html += '<div style="font-size:16px;font-weight:700;margin-bottom:6px;">回执管理面板</div>';
      html += '<div style="color:#9aa0a6;">正式名单来自 wedding.json 的 guests；本机回执来自浏览器。两者按手机号去重合并。</div>';
      html += '<div style="margin:10px 0;padding:10px 12px;background:#2f3339;border-radius:8px;">'
            + '合计 <b style="color:#f2a0b5;font-size:18px;">' + st.totalAttendees + '</b> 组 / '
            + '<b style="color:#f2a0b5;font-size:18px;">' + st.totalGuests + '</b> 人'
            + '（正式 ' + officialGuests().length + ' 组，本机 ' + localGuests().length + ' 组）</div>';

      if (list.length) {
        html += '<table style="width:100%;border-collapse:collapse;margin-top:4px;">'
              + '<tr><th style="text-align:left;padding:6px 4px;border-bottom:1px solid #4a4f56;">姓名</th>'
              + '<th style="text-align:left;padding:6px 4px;border-bottom:1px solid #4a4f56;">手机号</th>'
              + '<th style="text-align:left;padding:6px 4px;border-bottom:1px solid #4a4f56;">人数</th>'
              + '<th style="text-align:left;padding:6px 4px;border-bottom:1px solid #4a4f56;">来源</th></tr>';
        list.forEach(function (g) {
          html += '<tr><td style="padding:6px 4px;border-bottom:1px solid #3a3f45;">' + esc(g.name) + '</td>'
                + '<td style="padding:6px 4px;border-bottom:1px solid #3a3f45;">' + esc(maskPhone(g.phone)) + '</td>'
                + '<td style="padding:6px 4px;border-bottom:1px solid #3a3f45;">' + esc(g.count) + '</td>'
                + '<td style="padding:6px 4px;border-bottom:1px solid #3a3f45;">' + (srcNames[g.source] || g.source) + '</td></tr>';
        });
        html += '</table>';
      } else {
        html += '<div style="margin-top:10px;color:#9aa0a6;">暂无回执。正式名单可在 wedding.json 的 guests 里手工维护。</div>';
      }

      html += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">'
            + '<button id="copyTextBtn" style="flex:1;min-width:120px;padding:10px;border:none;border-radius:6px;background:#8e1f2f;color:#fff;cursor:pointer;">复制回执文字表</button>'
            + '<button id="copyJsonBtn" style="flex:1;min-width:120px;padding:10px;border:none;border-radius:6px;background:#3a7d44;color:#fff;cursor:pointer;">复制新的 wedding.json</button>'
            + '</div>';
      html += '<label style="display:flex;align-items:center;gap:6px;margin-top:10px;color:#9aa0a6;">'
            + '<input type="checkbox" id="maskChk" checked> 导出时手机号打码（防泄露，推荐）</label>';
      html += '<div style="margin-top:12px;color:#9aa0a6;">汇总步骤：复制新的 wedding.json - 回仓库覆盖同名文件并推送 - 所有访客即看到最新正式名单。</div>';
      panel.innerHTML = html;

      $('copyTextBtn').addEventListener('click', function () {
        var useMask = $('maskChk').checked;
        var fresh = mergedGuests();
        var freshSt = stats();
        var t = '婚宴回执合计 ' + freshSt.totalAttendees + ' 组 / ' + freshSt.totalGuests + ' 人\n'
              + fresh.map(function (g) {
                  return (g.name || '') + ' ' + (useMask ? maskPhone(g.phone) : g.phone) + ' ' + g.count + '人';
                }).join('\n');
        copyText(t, this);
      });
      $('copyJsonBtn').addEventListener('click', function () {
        copyText(buildJsonText($('maskChk').checked), this);
      });
    }

    refresh();
    window.__adminRefresh__ = refresh;
  }

  /* ---------- 交互 ---------- */
  function bindInteractions(startISO) {
    var bgm = $('bgm'), musicBtn = $('musicBtn'), st = $('st'), on = false;

    function play() {
      bgm.play().then(function () {
        on = true; musicBtn.classList.remove('off'); st.textContent = '音乐播放中...';
      }).catch(function () {
        st.textContent = '点击图标播放音乐';
      });
    }
    document.body.addEventListener('click', function () { play(); }, { once: true });
    musicBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (on) { bgm.pause(); on = false; musicBtn.classList.add('off'); st.textContent = '音乐已暂停'; }
      else { play(); }
    });

    $('cover').addEventListener('click', function () {
      document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
      window.scrollTo({ top: window.innerHeight * 0.9, behavior: 'smooth' });
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) e.target.classList.add('in'); });
    }, { threshold: .12 });
    document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

    var target = startISO ? new Date(startISO).getTime() : 0;
    function tick() {
      var diff = target - Date.now();
      if (diff < 0) diff = 0;
      $('d').textContent = String(Math.floor(diff / 86400000)).padStart(2, '0');
      $('h').textContent = String(Math.floor(diff % 86400000 / 3600000)).padStart(2, '0');
      $('m').textContent = String(Math.floor(diff % 3600000 / 60000)).padStart(2, '0');
      $('s').textContent = String(Math.floor(diff % 60000 / 1000)).padStart(2, '0');
    }
    tick();
    setInterval(tick, 1000);

    var maxPer = 8;
    try { if (window.__WEDDING_RAW__ && window.__WEDDING_RAW__.rsvp) maxPer = window.__WEDDING_RAW__.rsvp.maxPerSubmit || 8; } catch (e) {}

    $('submitBtn').addEventListener('click', function () {
      var name = $('name').value.trim();
      var phone = $('phone').value.trim();
      var count = parseInt($('count2').value, 10);

      if (!name) { alert('请填写姓名'); return; }
      if (!/^1[3-9]\d{9}$/.test(phone)) { alert('请填写正确的11位手机号'); return; }
      if (!count || count < 1) { alert('请选择出席人数'); return; }
      if (count > maxPer) { alert('单次最多填写' + maxPer + '人，如需更多请联系新人父亲'); return; }

      var btn = $('submitBtn');
      btn.disabled = true; btn.textContent = '提交中...';

      setTimeout(function () {
        try {
          saveGuest({ name: name, phone: phone, count: count, createdAt: new Date().toISOString() });
          $('ok').style.display = 'block';
          $('name').value = '';
          $('phone').value = '';
          $('count2').selectedIndex = 0;
          btn.textContent = '已提交';
          if (window.__adminRefresh__) window.__adminRefresh__();
          setTimeout(function () { btn.disabled = false; btn.textContent = '提 交'; }, 2500);
        } catch (e) {
          alert('保存失败，浏览器可能禁用了本地存储');
          btn.disabled = false; btn.textContent = '提 交';
        }
      }, 200);
    });
  }

  /* ---------- 启动 ---------- */
  loadWedding().then(function (d) {
    data = d;
    window.__WEDDING_RAW__ = d;
    var startISO = render(d);
    bindInteractions(startISO);
    renderAdmin(d);
  }).catch(function (e) {
    console.error('wedding.json 加载失败：', e);
    document.body.insertAdjacentHTML('afterbegin',
      '<div style="padding:16px;background:#fdecea;color:#b3261e;font-size:14px;">' +
      '数据加载失败：请确认 wedding.json 与本页面在同一目录' +
      '（本地双击打开时还需 wedding.json.js 同目录）。</div>');
  });
})();

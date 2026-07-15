(() => {
  const { categories, papers } = window.PAPER_ATLAS;
  const categoryGrid = document.querySelector("#categoryGrid");
  const paperList = document.querySelector("#paperList");
  const searchInput = document.querySelector("#searchInput");
  const clearFilter = document.querySelector("#clearFilter");
  const emptyState = document.querySelector("#emptyState");
  const resultText = document.querySelector("#resultText");
  const dialog = document.querySelector("#paperDialog");
  const dialogContent = document.querySelector("#dialogContent");
  let activeCategory = "";

  const esc = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  const figure = (type) => {
    if (type === "ring") return '<div class="figure ring"><i></i><i></i><i></i><i></i><span></span></div>';
    if (type === "modulator") return '<div class="figure modulator"><i></i><i></i><span></span></div>';
    return '<div class="figure laser"><b>GAIN</b><span></span><b>FILTER</b><em></em></div>';
  };

  function renderCategories() {
    categoryGrid.innerHTML = categories.map((category, i) => {
      const count = papers.filter((paper) => paper.category === category.name).length;
      return `<button class="category-card ${category.tone} ${activeCategory === category.name ? "active" : ""}" data-category="${esc(category.name)}">
        <span class="category-top"><i>0${i + 1}</i><b>${esc(category.code)}</b></span>
        <h3>${esc(category.name)}</h3><p>${esc(category.description)}</p>
        <span class="chips">${category.subs.map((sub) => `<small>${esc(sub)}</small>`).join("")}</span>
        <span class="category-foot"><small>已收录</small><strong>${count}</strong></span>
      </button>`;
    }).join("");
  }

  function matches(paper, query) {
    const haystack = [paper.title, paper.titleZh, paper.category, paper.subcategory, paper.journal, paper.abstractZh, paper.insight, ...paper.authors, ...paper.institutions, ...paper.keywords].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase());
  }

  function renderPapers() {
    const query = searchInput.value.trim();
    const filtered = papers.filter((paper) => (!activeCategory || paper.category === activeCategory) && (!query || matches(paper, query)));
    paperList.innerHTML = filtered.map((paper, i) => `<article class="paper-card">
      <span class="paper-number">${String(i + 1).padStart(2, "0")}</span>
      <div class="paper-copy">
        <p class="meta"><b>${esc(paper.category)} · ${esc(paper.subcategory)}</b><i></i>${esc(paper.journal)}<i></i>${esc(paper.published)} ${paper.sample ? "<em>示例数据</em>" : ""}</p>
        <h3><button data-paper="${esc(paper.slug)}">${esc(paper.title)}</button></h3>
        <p class="title-zh">${esc(paper.titleZh)}</p><p class="authors">${esc(paper.authors.join(" · "))}</p>
        <div class="insight"><b>创新点</b><span>${esc(paper.insight)}</span></div>
        <div class="paper-tags">${paper.keywords.map((tag) => `<button data-tag="${esc(tag)}"># ${esc(tag)}</button>`).join("")}</div>
      </div>
      <button class="paper-figure" data-paper="${esc(paper.slug)}" aria-label="查看论文详情">${figure(paper.figure)}<span>查看详情 →</span></button>
    </article>`).join("");
    emptyState.hidden = filtered.length !== 0;
    resultText.textContent = `${filtered.length} 篇结果${activeCategory ? ` · ${activeCategory}` : ""}`;
  }

  function openPaper(slug) {
    const paper = papers.find((item) => item.slug === slug);
    if (!paper) return;
    dialogContent.innerHTML = `<article class="detail" style="--accent:${paper.accent}">
      <div class="detail-head"><p>${esc(paper.category)} · ${esc(paper.subcategory)}</p><h2>${esc(paper.title)}</h2><h3>${esc(paper.titleZh)}</h3><div><b>${esc(paper.journal)}</b><span>${esc(paper.published)}</span></div></div>
      <div class="detail-grid"><div>
        <section><small>01 · 中文摘要</small><p class="abstract">${esc(paper.abstractZh)}</p></section>
        <section class="insight-box"><small>02 · 50 字创新点</small><blockquote>${esc(paper.insight)}</blockquote></section>
        <section><small>03 · 关键图</small>${figure(paper.figure)}<p class="caption">${esc(paper.caption)}</p></section>
      </div><aside><small>论文信息</small><dl><dt>主要作者</dt><dd>${esc(paper.authors.join("、"))}</dd><dt>作者单位</dt><dd>${esc(paper.institutions.join("；"))}</dd><dt>关键词</dt><dd class="dialog-tags">${paper.keywords.map((tag) => `<span>${esc(tag)}</span>`).join("")}</dd></dl></aside></div>
    </article>`;
    dialog.showModal();
    history.replaceState(null, "", `#paper=${paper.slug}`);
  }

  function renderIndex() {
    const authors = [...new Set(papers.flatMap((paper) => paper.authors))];
    const tags = [...new Set(papers.flatMap((paper) => paper.keywords))];
    document.querySelector("#authorIndex").innerHTML = authors.map((author) => `<button data-query="${esc(author)}">${esc(author)}</button>`).join("");
    document.querySelector("#tagIndex").innerHTML = tags.map((tag) => `<button data-query="${esc(tag)}"># ${esc(tag)} <small>${papers.filter((paper) => paper.keywords.includes(tag)).length}</small></button>`).join("");
  }

  document.addEventListener("click", (event) => {
    const categoryButton = event.target.closest("[data-category]");
    const paperButton = event.target.closest("[data-paper]");
    const tagButton = event.target.closest("[data-tag], [data-query]");
    if (categoryButton) { activeCategory = activeCategory === categoryButton.dataset.category ? "" : categoryButton.dataset.category; renderCategories(); renderPapers(); document.querySelector("#papers").scrollIntoView({ behavior: "smooth" }); }
    if (paperButton) openPaper(paperButton.dataset.paper);
    if (tagButton) { searchInput.value = tagButton.dataset.tag || tagButton.dataset.query; activeCategory = ""; renderCategories(); renderPapers(); document.querySelector("#papers").scrollIntoView({ behavior: "smooth" }); }
  });
  searchInput.addEventListener("input", renderPapers);
  clearFilter.addEventListener("click", () => { activeCategory = ""; searchInput.value = ""; renderCategories(); renderPapers(); });
  document.querySelector("#dialogClose").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener("close", () => history.replaceState(null, "", location.pathname));
  document.addEventListener("keydown", (event) => { if (event.key === "/" && document.activeElement !== searchInput) { event.preventDefault(); searchInput.focus(); } });
  renderCategories(); renderPapers(); renderIndex();
  const initial = location.hash.match(/^#paper=(.+)$/); if (initial) openPaper(initial[1]);
})();

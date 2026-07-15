import Link from "next/link";

export function SiteHeader({ active = "library" }: { active?: "library" | "index" | "search" | "groups" | "upload" | "admin" }) {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="返回文献库首页">
        <span className="brand-mark">PX</span>
        <span className="brand-copy">
          <strong>PhotonicsX × RIQT Literature Atlas</strong>
          <small>Fudan University × The Hong Kong Polytechnic University</small>
        </span>
      </Link>
      <nav className="main-nav" aria-label="主导航">
        <Link className={active === "library" ? "active" : ""} href="/">文献库</Link>
        <Link className={active === "index" ? "active" : ""} href="/index">索引</Link>
        <Link className={active === "search" ? "active" : ""} href="/search">标题搜索</Link>
        <Link className={active === "groups" ? "active" : ""} href="/groups">联合课题组</Link>
        <Link className={active === "admin" ? "active" : ""} href="/admin">审核</Link>
        <Link className="upload-nav" href="/upload">＋ 上传论文</Link>
      </nav>
    </header>
  );
}

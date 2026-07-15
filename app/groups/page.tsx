import { SiteHeader } from "../components/SiteHeader";

export default function GroupsPage() {
  return (
    <main><SiteHeader active="groups" /><div className="groups-shell"><span className="section-kicker">JOINT RESEARCH COMMUNITY</span><h1>两个课题组，一份持续生长的研究记忆。</h1><p className="groups-lead">该文献库暂由复旦大学未来信息创新学院 PhotonicsX 课题组与香港理工大学量子技术研究中心 RIQT 课题组联合使用。</p><div className="group-cards"><section><div className="group-logo-placeholder">PX</div><span>FUDAN UNIVERSITY</span><h2>PhotonicsX 课题组</h2><p>未来信息创新学院 · 研究方向与团队介绍待补充</p><div className="group-needed"><b>待提供资料</b><span>课题组 Logo（PNG / SVG）</span><span>团队简介与研究方向</span><span>负责人及成员信息</span><span>官方网站与联系方式</span></div></section><section><div className="group-logo-placeholder riqt">R</div><span>THE HONG KONG POLYTECHNIC UNIVERSITY</span><h2>RIQT 课题组</h2><p>量子技术研究中心 · Q-chip 方向 · 团队介绍待补充</p><div className="group-needed"><b>待提供资料</b><span>RIQT / Q-chip Logo（PNG / SVG）</span><span>团队简介与研究方向</span><span>负责人及成员信息</span><span>官方网站与联系方式</span></div></section></div><div className="groups-note"><b>后续内容完善</b><p>收到正式 Logo、成员照片与文字资料后，可加入团队页面、作者主页、课题组归属标签及成员贡献记录。</p></div></div></main>
  );
}

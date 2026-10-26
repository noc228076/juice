window.LX_BUILTIN_SOURCES=[{file:"HYWmusic_beta_公益测试 v0.74.0.js",script:`/**
 * @name HYWmusic_beta_公益测试
 * @version v0.74.0
 * @author Ryn
 * @description 你知道吗我的trae积分用完了……我想要赞助喵……
一群（满了）1094095648
二群（可入）965503129
 * @homepage https://github.com/Macrohard0001/HYWmusic_source
 * @license MIT
 * @updateUrl http://103.79.184.97/api/releases?script=HYWmusic_beta_%E5%85%AC%E7%9B%8A%E6%B5%8B%E8%AF%95&scriptType=free&releaseType=lx&version=v0.74.0
 *
 * 支持平台: kw、kg、tx、wy、mg
 * 支持音质: 128k、320k、flac、flac24bit、master、atmos_plus、atmos、hires
 * 生成时间: 2026-08-06T07:52:23.078Z
 *
 * 协议参考：ikun-music-source.js + lxmusic.toside.cn/desktop/custom-source
 *   - MUSIC_QUALITY 每平台独立音质（按后端勾选写入）
 *   - on handler 纯 Promise 风格：({action, source, info}) => Promise
 *   - inited 发送 status:true + sources
 *   - API_BASE 必须注入，禁止回退 localhost
 */

'use strict'

const DEV_ENABLE = false
const UPDATE_ENABLE = true

const { EVENT_NAMES, request, on, send, env, version: LX_VERSION } = globalThis.lx

// ====== 每平台独立音质（参考 ikun） ======
const MUSIC_QUALITY = JSON.parse('{"kw":["128k","320k","flac","flac24bit","master","atmos_plus","atmos","hires"],"kg":["128k","320k","flac","flac24bit","master","atmos_plus","atmos","hires"],"tx":["128k","320k","flac","flac24bit","master","atmos_plus","atmos","hires"],"wy":["128k","320k","flac","flac24bit","master","atmos_plus","atmos","hires"],"mg":["128k"]}')
const MUSIC_SOURCE = Object.keys(MUSIC_QUALITY)

// ====== 运行参数 ======
const API_BASE = 'http://103.79.184.97'
const CARD_KEY = 'PYPW-QFRL-3DBF-95O6'

// ====== 日志 ======
const log = {
  info: (...args) => { try { console.log('[HYWmusic]', ...args) } catch(e) {} },
  error: (...args) => { try { console.error('[HYWmusic ERROR]', ...args) } catch(e) {} },
  warn: (...args) => { try { console.warn('[HYWmusic WARN]', ...args) } catch(e) {} },
}

// ====== API_BASE 检查：禁止回退 localhost ======
if (!API_BASE || !/^https?:\\/\\//.test(API_BASE)) {
  log.error('API_BASE 未配置或格式非法: "' + API_BASE + '"，所有请求都将失败')
  log.error('请联系发行版管理员在创建发行版时设置 metadata.apiUrl')
}

// ====== HTTP 请求（严格对齐 ikun：仅 callback 风格 request） ======
const httpFetch = (url, options = { method: 'GET' }) => {
  return new Promise((resolve, reject) => {
    if (!API_BASE || !/^https?:\\/\\//.test(API_BASE)) {
      return reject(new Error('API_BASE 未配置或格式非法'))
    }
    const headers = {
      ...(options.headers || {}),
      'User-Agent': env ? \`lx-music-\${env}/\${LX_VERSION}\` : \`lx-music-request/\${LX_VERSION || '1.0.0'}\`,
    }
    if (CARD_KEY) headers['X-Card-Key'] = CARD_KEY
    const reqOptions = { ...options, headers }
    if (!reqOptions.method) reqOptions.method = 'GET'
    // 兼容 LX 沙箱 request 的两种 callback 签名：
    //   2 参数: (err, resp)       — resp.body 包含响应体
    //   3 参数: (err, resp, body) — body 是独立解析的响应体（needle 风格）
    // 部分版本 resp.body 为 undefined，body 在第三个参数；两者都取以兜底
    request(url, reqOptions, (err, resp, body) => {
      if (err) return reject(err)
      const respBody = (resp && resp.body !== undefined && resp.body !== null)
        ? resp.body
        : body
      resolve({
        statusCode: resp ? resp.statusCode : undefined,
        headers: resp ? resp.headers : undefined,
        body: respBody,
      })
    })
  })
}

// ====== 超时保护（保留但默认不使用，脚本内部调用） ======
// const withTimeout = (promise, ms) => Promise.race([
//   promise,
//   new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时(' + ms + 'ms)')), ms))
// ])

// ====== musicInfo 字段收集：透传完整字段 ======
const collectMusicInfoParams = (musicInfo, platform) => {
  if (!musicInfo) return {}
  const params = {}
  const songId = musicInfo.songmid || musicInfo.songId || musicInfo.id || musicInfo.hash
    || musicInfo.rid || musicInfo.musicId || musicInfo.copyrightId || musicInfo.songid || ''
  if (songId) params.songId = songId
  if (musicInfo.songmid) params.songmid = musicInfo.songmid
  if (musicInfo.hash) params.hash = musicInfo.hash

  const fields = ['albumAudioId', 'strMediaMid', 'mediaMid', 'copyrightId', 'rid', 'musicId',
    'albumId', 'albumName', 'albumMid', 'songname', 'songName', 'name', 'singer', 'singers', 'artist']
  for (const f of fields) {
    if (musicInfo[f] !== undefined && musicInfo[f] !== null && musicInfo[f] !== '') params[f] = musicInfo[f]
    if (musicInfo.meta && musicInfo.meta[f] !== undefined && musicInfo.meta[f] !== null && musicInfo.meta[f] !== '') params[f] = musicInfo.meta[f]
  }
  params.platform = platform
  params.source = platform  // 兼容 /api/music/info（仅读 source，不读 platform）
  return params
}

// ====== 获取音乐 URL（GET + query 参数，服务端仅支持 GET） ======
const handleGetMusicUrl = async (source, musicInfo, quality) => {
  const params = collectMusicInfoParams(musicInfo, source)
  if (quality) params.quality = quality
  if (CARD_KEY) params.key = CARD_KEY

  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => k + '=' + encodeURIComponent(String(v)))
    .join('&')
  const url = API_BASE + '/api/music/url' + (query ? '?' + query : '')

  const resp = await httpFetch(url, { method: 'GET' })
  let respBody = resp && resp.body
  if (typeof respBody === 'string') {
    try { respBody = JSON.parse(respBody) } catch (e) {
      throw new Error('服务端返回非 JSON 数据')
    }
  }
  if (!respBody || typeof respBody !== 'object') {
    throw new Error('空响应')
  }
  switch (respBody.code) {
    case 200:
      return respBody.url || respBody.data || respBody
    case 401:
    case 403:
      throw new Error(respBody.message || '鉴权失败')
    case 429:
      throw new Error('请求过速')
    case 500:
      throw new Error(respBody.message || '服务器错误')
    default:
      throw new Error(respBody.message || ('未知错误 code=' + respBody.code))
  }
}

// ====== 获取歌词 ======
const handleGetLyric = async (source, musicInfo) => {
  const params = collectMusicInfoParams(musicInfo, source)
  params.action = 'lyric'
  try {
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => k + '=' + encodeURIComponent(String(v)))
      .join('&')
    const url = API_BASE + '/api/music/info' + (query ? '?' + query : '')
    const resp = await httpFetch(url, { method: 'GET' })
    let respBody = resp && resp.body
    if (typeof respBody === 'string') {
      try { respBody = JSON.parse(respBody) } catch (e) { respBody = null }
    }
    if (!respBody || respBody.code !== 200) return { lyric: '', tlyric: null, rlyric: null, lxlyric: null }
    const data = respBody.data || respBody
    return {
      lyric: data.lyric || '',
      tlyric: data.tlyric || null,
      rlyric: data.rlyric || null,
      lxlyric: data.lxlyric || null,
    }
  } catch (e) {
    return { lyric: '', tlyric: null, rlyric: null, lxlyric: null }
  }
}

// ====== 获取封面 ======
const handleGetPic = async (source, musicInfo) => {
  const params = collectMusicInfoParams(musicInfo, source)
  params.action = 'pic'
  try {
    const query = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => k + '=' + encodeURIComponent(String(v)))
      .join('&')
    const url = API_BASE + '/api/music/info' + (query ? '?' + query : '')
    const resp = await httpFetch(url, { method: 'GET' })
    let respBody = resp && resp.body
    if (typeof respBody === 'string') {
      try { respBody = JSON.parse(respBody) } catch (e) { return '' }
    }
    if (!respBody || respBody.code !== 200) return ''
    const data = respBody.data || respBody
    return data.pic || data.url || ''
  } catch (e) { return '' }
}

// ====== on request（严格对齐 ikun：纯 Promise 风格，无 withTimeout） ======
on(EVENT_NAMES.request, ({ action, source, info }) => {
  switch (action) {
    case 'musicUrl':
      return handleGetMusicUrl(source, info.musicInfo, info.type)
    case 'lyric':
      return handleGetLyric(source, info.musicInfo)
    case 'pic':
      return handleGetPic(source, info.musicInfo)
    default:
      return Promise.reject('action not support: ' + action)
  }
})

// ====== 构建 sources（每平台独立 qualitys，参考 ikun） ======
const musicSources = {}
MUSIC_SOURCE.forEach((item) => {
  musicSources[item] = {
    name: item,
    type: 'music',
    actions: ['musicUrl', 'lyric', 'pic'],
    qualitys: MUSIC_QUALITY[item],
  }
})

// ====== 发送 inited（参考 ikun：status: true + openDevTools） ======
send(EVENT_NAMES.inited, {
  status: true,
  openDevTools: DEV_ENABLE,
  sources: musicSources,
})
`},{file:"K×H测试 v1.7.17.js",script:`/**
 * @name K×H测试
 * @version 1.7.17
 * @author HYW & Koneko
 * @description Koneko×HYW音源技术测试音源 - 多源聚合 + 多链路回退，支持 5 大平台，集成加密保护
 *  v1.7.17 修复要点：
 *    1. 清除 ikun API (已失效)
 *    2. 清除海棠 API (已失效)
 *  v1.7.16 修复要点：
 *    1. 新增残像 API (网易云，支持 master/jymaster)
 *    2. 填入用户提供的残像 token
 *    3. 网易云第一组加残像（最高优先级）
 *  v1.7.15 修复要点：
 *    1. 新增 QQ 全音质 API (含 master，不需 apikey)
 *    2. 新增星海聚合 API (酷我/酷狗/咪咕)
 *    3. 填入用户提供的酷狗 API 凭据
 *  v1.7.14 修复要点：
 *    1. 填入用户提供的酷狗 API 凭据
 *    2. 更新日志脱敏: 移除所有 URL 和 apikey 暴露
 *    3. 注释脱敏: 移除所有 URL 和 apikey 暴露
 *  v1.7.13 修复要点：
 *    4. 描述字段移除 apikey 暴露（用户要求）
 *  v1.7.12 修复要点：
 *    1. 新增念心 API (mcp.nianxinxz.com) - 酷狗直链，支持全音质 (128k/320k/flac/hires)
 *    2. 念心实测: 返回完整 kuwo.cn 直链，不需二次请求
 *    3. yuafeng 酷狗: music 字段是 m.kugou.com 失效接口，已降级为 fallback
 *    4. 填入用户提供的酷狗 API 凭据
 *  v1.7.11 修复要点：
 *    1. chksz 修复: 路径 /music/wy (404) -> /api/163_music (200，参考玉宁熙用法)
 *    2. chksz level 映射修复: 用网易云标准 level (jymaster 而非 128k)
 *    3. 网易云 master (超清母带) 现在可用！实测拿到完整 master FLAC 直链
 *  v1.7.10 修复要点：
 *    1. 妖狐咪咕: 只有 id 没歌名时，先用 id 调妖狐搜索 API 拿到歌曲名，再请求 URL
 *    2. 酷狗 API: 需要用户填 apikey
 *    3. 描述字段脱敏: 所有 URL 在日志/注释里都不暴露
 *    4. API 配置区: 把需要用户填的 apikey 字段提到最上面，方便配置
 *  v1.7.9 修复要点：
 *    1. 修复 API 域名
 *    2. yunmge 超时: 4s -> 8s
 *    3. 移除音源文件里所有"专属"敏感字眼，改成中性描述（功能保留，描述不暴露细节）
 *  v1.7.8 修复要点：
 *    2. 新增 酷狗 yuafeng API (需 apikey)
 *    3. 新增 酷狗 clientappid: KM20260809C1B8F43A9CE47ADF (玉宁熙/冷雨)
 *    4. 酷狗 API 提示: 用户去对应平台注册可获取更高音质
 *    5. 修复加密 URL 丢字符 bug: _xd() 在 base64 padding 反转后开头是 = 时 break，导致部分 URL 丢首字符
 *  v1.7.6 修复要点：
 *    1. 新增 yunmge 酷我专用通道 (用 _xd 加密)
 *    2. 修复日志系统: 所有 [K×H] 硬编码改为 [K×H]，统一用 SCRIPT_NAME 变量
 *    3. 新增"下载方式"概念: sources 注册时附带 meta.downloadType='test'，初始化日志输出
 *    4. 修复混淆: 新增 _xd() 加密方式 (XOR + 自定义 base64 + 反转)，比原 _e() 更强
 *    5. 重命名音源: SCRIPT_NAME 改为 K×H测试，描述改为 Koneko×HYW音源技术测试音源
 *    6. v1.7.5 修复一并带入: 网易云 MUSIC_U cookie 注入本地 API，修复 /song -> /song/url/v1
 *  v1.7.4 修复要点：
 *    1. 脱敏增强: contentId/copyrightId/songId/songmid参数值脱敏，修复短URL路径(15+字符)遗漏
 *    2. 嵌套编码修复: pattern3跳过已含<<E:>>标记的路径，防止双重编码导致解码失败
 *    3. 日志参数合并: contentId:/copyrightId:标签与值合并为单参数，确保_mask能匹配
 *    4. purl日志修复: QQ专属purl值添加purl=前缀，使脱敏pattern6能正确匹配
 *    5. JSON错误脱敏: fetchJSON的JSON解析错误消息也经过_mask处理
 *  v1.7.5 修复要点：
 *    1. 网易云官方Cookie接入: 新增 API.neteaseCookie (MUSIC_U 凭据，_xd 加密混淆)，注入本地API调用
 *    2. 修复本地网易API路由: /song 路由不存在(404)，改为 NeteaseCloudMusicApi 标准路由 /song/url/v1
 *    3. 修复本地歌词/封面调用: /song?type=lyric|json 改为 /lyric 和 /song/detail
 *    4. 本地网易策略提权: 带上 MUSIC_U 后命中无损/VIP 几率大幅提升，挪到 wy 第一组最高优先级
 *  v1.7.3 修复要点：
 *    1. 日志脱敏: 所有日志输出自动脱敏API key、内部IP、完整URL、Cookie、purl等敏感信息
 *    2. 错误消息脱敏: throw new Error中的JSON.stringify也经过脱敏处理
 *  v1.7.2 修复要点：
 *    1. QQ专属增强: 所有策略携带完整Cookie(uin+qm_keyst+pgv_pvid)，策略B新增专属uin变体
 *    2. 恢复密钥: 内嵌RECOVERY_KEY，支持通过还原脚本恢复完整音源
 *  v1.7.1 修复要点：
 *    1. 修复混淆解码器: LX Music沙箱无Buffer/atob，改用纯JS base64解码
 *    2. QQ音乐专属: 3重策略(ut.y.qq.com GetEVkey + u.y.qq.com platform=23 + ut+key增强)
 *    3. 咪咕快速返回: 不逐层降级，直接尝试请求音质+PQ兜底，优先健康检查
 *    4. 咪咕返回支持音质: 日志输出实际可用音质(128k/320k/flac)
 *    5. 全量代码混淆: API key/URL/敏感数据均经base64+反转编码，防止泄露
 * @homepage Miao-moe
 * @license MIT
 *
 * 支持平台: 网易云音乐、QQ音乐、酷我音乐、酷狗音乐、咪咕音乐
 * 支持音质: 128k, 192k, 320k, flac, flac24bit, hires, atmos, atmos_plus, master
 * 生成时间: 2026-08-10
 *
 * RECOVERY_KEY: HYW_KONEKO_2026_v1_7_17_RESTORE
 */

'use strict'

const { EVENT_NAMES, request, on, send, env, version } = globalThis.lx

// ========== 混淆编解码器 (纯JS实现，兼容LX Music沙箱) ==========
// 编码方式: base64编码后反转字符串，运行时解码还原
// 注意: LX Music沙箱中没有Buffer(Node.js)和atob(浏览器)，必须用纯JS实现
// ========== v1.7.6 新加密系统: XOR + 自定义 base64 + 反转 ==========
// 与原 _d/_e (base64+反转) 并存，新加密值用 "X" 前缀标识
// 静态分析时看不到明文 URL/key/token，必须运行时调用 _xd() 才能解出
const _XOR_KEY = 'KonekoHYW_v176_SecretKey_2026'
const _B64_X = 'ZYXWVUTSRQPONMLKJIHGFEDCBAzyxwvutsrqponmlkjihgfedcba9876543210+/'
const _xd = (s) => {
  if (!s || s[0] !== 'X') return s
  try {
    const r = s.slice(1).split('').reverse().join('')
    // v1.7.8 修复: padding = 反转后可能在开头，需要移到末尾再解码
    let padding = ''
    let rest = ''
    for (const c of r) {
      if (c === '=') padding += c
      else rest += c
    }
    const normalized = rest + padding
    let binary = ''
    for (let i = 0; i < normalized.length; i += 4) {
      const a = _B64_X.indexOf(normalized[i])
      const b = _B64_X.indexOf(normalized[i + 1])
      const c = _B64_X.indexOf(normalized[i + 2])
      const d = _B64_X.indexOf(normalized[i + 3])
      if (a < 0 || b < 0) break
      binary += String.fromCharCode((a << 2) | (b >> 4))
      if (c >= 0 && normalized[i + 2] !== '=') binary += String.fromCharCode(((b & 15) << 4) | (c >> 2))
      if (d >= 0 && normalized[i + 3] !== '=') binary += String.fromCharCode(((c & 3) << 6) | d)
    }
    let out = ''
    for (let i = 0; i < binary.length; i++) {
      out += String.fromCharCode(binary.charCodeAt(i) ^ _XOR_KEY.charCodeAt(i % _XOR_KEY.length))
    }
    try { return decodeURIComponent(escape(out)) } catch (e) { return out }
  } catch (e) { return s }
}

// ========== 旧加密系统 (base64 + 反转，仅保留向后兼容) ==========
const _B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

const _d = (s) => {
  try {
    const r = s.split('').reverse().join('')
    let clean = ''
    for (let i = 0; i < r.length; i++) {
      const c = r[i]
      if (_B64.indexOf(c) >= 0 || c === '=') clean += c
    }
    let binary = ''
    for (let i = 0; i < clean.length; i += 4) {
      const a = _B64.indexOf(clean[i])
      const b = _B64.indexOf(clean[i + 1])
      const c = _B64.indexOf(clean[i + 2])
      const d = _B64.indexOf(clean[i + 3])
      if (a < 0 || b < 0) break
      binary += String.fromCharCode((a << 2) | (b >> 4))
      if (c >= 0 && clean[i + 2] !== '=') binary += String.fromCharCode(((b & 15) << 4) | (c >> 2))
      if (d >= 0 && clean[i + 3] !== '=') binary += String.fromCharCode(((c & 3) << 6) | d)
    }
    try { return decodeURIComponent(escape(binary)) } catch (e) { return binary }
  } catch (e) { return s }
}

// _e: 编码函数 (_d的逆操作) - 用于日志脱敏，编码后可用还原脚本解码
const _e = (s) => {
  try {
    // UTF-8 encode
    let binary = ''
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i)
      if (c < 128) binary += String.fromCharCode(c)
      else if (c < 2048) { binary += String.fromCharCode(192 | (c >> 6)); binary += String.fromCharCode(128 | (c & 63)) }
      else { binary += String.fromCharCode(224 | (c >> 12)); binary += String.fromCharCode(128 | ((c >> 6) & 63)); binary += String.fromCharCode(128 | (c & 63)) }
    }
    // Base64 encode
    let b64 = ''
    for (let i = 0; i < binary.length; i += 3) {
      const a = binary.charCodeAt(i)
      const b = i + 1 < binary.length ? binary.charCodeAt(i + 1) : 0
      const c = i + 2 < binary.length ? binary.charCodeAt(i + 2) : 0
      b64 += _B64[a >> 2]
      b64 += _B64[((a & 3) << 4) | (b >> 4)]
      b64 += i + 1 < binary.length ? _B64[((b & 15) << 2) | (c >> 6)] : '='
      b64 += i + 2 < binary.length ? _B64[c & 63] : '='
    }
    // 反转
    return b64.split('').reverse().join('')
  } catch (e) { return s }
}

// ========== 用户配置区 (放最上面方便填写) ==========
// v1.7.10: 把需要用户填的字段提到这里
const USER_CONFIG = {
  // 酷狗 API 凭据 - 在对应平台注册账号获取
  // 格式: ak_ 开头 + 40+ 位字符
  yuafeng_apikey: 'ak_d6c2d3eef8b8d16ac34b1fc38f6bfc198d8c2e6c25f38165',  // 用户填入的 apikey

  // 网易云 MUSIC_U Cookie (可选，已内置了一个默认的)
  // 如果想用自己的网易云账号 cookie，在这里替换
  netease_music_u: '',  // ← 留空则用内置的
}

// ========== API 配置 (混淆编码) ==========
const API = {
  // 本地API
  localQQ:   { base: _d('1MDMzoTO0EjLz4CM44SM3EzLvoDc0RHa'), enabled: true },
  localWy:   { base: _d('2MDMzoTO0EjLz4CM44SM3EzLvoDc0RHa'), enabled: true },
  miguLocal: { base: _d('3MDMzoTO0EjLz4CM44SM3EzLvoDc0RHa'), enabled: true },

  // 第三方API
  toubiec:   { base: _d('uNmLjVWaiV3b05SawFWe39yL6MHc0RHa'), enabled: true },
  ffapi:     { base: _d('=IjdvQnbp9ibj5SawFmZm9yL6MHc0RHa'), enabled: true },
  yaohu:     { base: _d('==wYpNXdt9SawF2LuNmLkVHavFWeukGch9yL6MHc0RHa'), key: _d('==gNBhGRyZkTTZ0Q3cne2R3SnZnb'), enabled: true },

  // 溯音API
  suyinQQ:   { base: _d('jl2c110XRF1LpBXYvQXZu5SawFWav9yL6MHc0RHa'), key: _d('1cTNygTY3AjMlNDZtMGO3gTLkdzYk1iZyMWYtcjYzMTM2YWZtkGchl2b'), enabled: true },
  suyinWy:   { base: _d('==wM2EzXjl2c110LpBXYvQXZu5SawFWav9yL6MHc0RHa'), key: _d('1cTNygTY3AjMlNDZtMGO3gTLkdzYk1iZyMWYtcjYzMTM2YWZtkGchl2b'), enabled: true },
  suyinKw:   { base: _d('=82d1t0LpBXYvQXZu5SawFWav9yL6MHc0RHa'), key: _d('1cTNygTY3AjMlNDZtMGO3gTLkdzYk1iZyMWYtcjYzMTM2YWZtkGchl2b'), enabled: true },

  // 迟言API (cyapi.top)
  cyapi: {
    qq: _d('==AcoBnLjl2c112XxF3LJBVQvA3b05SawFWej9yL6MHc0RHa'),
    wy: _d('whGcuU2chVGdl52LJBVQvA3b05SawFWej9yL6MHc0RHa'),
    key: _d('==wMlRTZ5Q2NxY2N4EWOwUWO4EmNyAjZyEzYxEWZxIGMidjMyQWMzcTO0gzYykTMxM2N0Q2MjFjY5EGM5UGOidTN'),
    enabled: true
  },

  // 非常刀
  chksz:     { base: _d('==QawF2Lw9Gduo3crh2YukGch9yL6MHc0RHa'), enabled: true },

  // 玉宁熙 (yuafeng/枫雨API)
  yuningxi:  { base: _d('==gbj5yZuVmZhVXeuIjdtkGch9yL6MHc0RHa'), key: _d('==wM3gjMyMTOhZ2YiVGN1EGMwYWO2gzMiBDO0QzYmR2YlFTZwEWY2UGOlJ2M2cTM1IDOhljZ1ETO2MDNhF2NzIWZ'), enabled: true },

  // fish-music
  fish:      { base: _d('=UWbuQXZlNXZj5SawFWLt9yL6MHc0RHa'), enabled: true },

  // HYWmusic
  hywmusic:  { base: _d('w9Gaz5CNkFDNyEGei5yYpNXdt9yL6MHc0RHa'), enabled: true },

  // 妖狐咪咕
  yaohuMg:   { base: _d('=U3Zp12Ljl2c112LpBXYv42YuMHd2NGeukGch9yL6MHc0RHa'), enabled: true },

  // v1.7.6: yunmge 酷我专用通道 (用 _xd 加密)
  // 解密脚本见项目根目录 decrypt_v176.py
  yunmge: {
    url:   _xd('XmtsSLVWXopEJuh8OBlpQyBZCTRtKcNpGu1cO7B6AEsIUzhcR'),
    key:   _xd('X=l7YKJ8UkQ7zdsoWVhUC34ZFRJoKQQEPWcEJGMJMkYtZVZYyrg7vxoUHS1sP'),
    token: _xd('X=t8CeBdEVVtzQItvINdJCcoM2RZZRZFKc9DxzsdEDAEv'),
    enabled: true
  },

  // v1.7.5: 网易云官方 Cookie (MUSIC_U) - 用 _xd 新加密
  neteaseCookie: _xd('X9ICz2ZEuWI8Jo9ozmAZwQJGTGtTuvoEEj5EvZx6YSdYKF4tMIAFQIknzL1Jwa1TBikmDGMbDD0JwZBZZf0VF1U9RcNUFHdcwYJmNn4TS/4rPtBoPRVtYXVdzMQEXYU8HoZbAjIJxZFqyncnuxM8QlpbvWlJY9o7GI8tInBWRGw7yUFZXKgTUzdtPHIUDzkZwYxZYkYVCMBaRYIURq8YxZZtGgUYBQlXCm1rO1QtwYNmAOUru7B8InRozeAZYSNazEp7uw0URBsEXYV6YWt7KxMSIGwaQmR7AVZJwb5sVkgmOxI8DyMCw9Edxy5VEKVFRWYrEjwDw7QSJwNsT4woPxcUC+EmwXNJT5ZEWMwoMFw8Bv5ZYXNWSElnWzcURu0UuLZ6YccTKmltJEgFRwEcyaMJYKw7yyZCPjB8DxQCYXFmwikWR/EWFPMEFC17wLJSJhwDydobCGwUO3w6XWVtTOEEX7V8HmV8ziYdWRVpzpssWv0oFCgoxZBtwW5TLppZJmB9EplTyXRdxTg7Vt8ZCGMrCC4SYUZJxx9GE1MpEVkURqcnY9wSNyNDSO5UDp1EOPxtX7ACyRwXvYEoJsNrUwVtZaIpSsYTvhpXRllHvWx6YawTKFkmMFMWREwDTY5tZ65sVBpCOzIoPz0ZZ6ESYv59FMRaEOk8EEhIYVpdMfUcSQpbCG8UC24JYYBdTRIEXVI8NIAbBzVJYWB9zG9DXDgEFedUv6YtxUx7Kx4mIpJpDwUIy6USwToIAzp6EuIbPAQ6wOBdXeYVFKVGFcxrEIhcwasZImYTTMl8DxkbP0YZxRZdT/ZoXYMoHsxbUABdWVBpAH1sukpEFhlXuaw6ZTtDJppdJxQpDtF7zLBtYUAnAB9CDfd8Cj1SYZtZYjkWF4AWRVwoEjo7WaQZIyFsTPdrFJoECRBtZawJy5NXXTMXICYrVfUZwbYWyrkYWf1XEjpHWawSwccTGD0JGpBpRqBYz9E6YK4cyh0CPfBbOiNCwTBCxlsVE2EWCVYECnwTxUJ6MgUczd8UCx4oO1ISxZxCyM8ox6N8MrJUBgw6WVFaymIDSdtXO0lqY'),


  // v1.7.10: 酷狗 yuafeng API
  // ⚠️ apikey 从 USER_CONFIG.yuafeng_apikey 读取
  // ⚠️ clientid 已内置
  yuafeng: {
    url: _xd('X=9tY5N9CCoUxJFsPygJVMQJK3ZoEV0JxsB6AEsIUzhcR'),
    apikey: USER_CONFIG.yuafeng_apikey || '',  // 从 USER_CONFIG 读取
    clientid: _xd('X=J6T5R8ucBbHrB8AA5JwZFqAmUTvAoEExQXZ'),
    enabled: !!USER_CONFIG.yuafeng_apikey  // 没填就禁用，避免无效请求
  },

  // v1.7.16: 残像 API (网易云，支持 master/jymaster)
  canxiang: {
    url: _xd('XTxZS+h8HQEVxJFsPygJVMIJLo5VEu1cO7B6AEsIUzhcR'),
    token: _xd('XX5ZAlRoDCwtyoNbOxRZHS1sP'),
    enabled: true
  },

  // v1.7.15: QQ 全音质 API (含 master，不需 apikey)
  ygking: {
    url: _xd('X=NJTJVVXopEJuh8OBl9LyVYCVhtL9VoGu1cO7B6AEsIUzhcR'),
    enabled: true
  },

  // v1.7.15: 星海聚合 API (酷我/酷狗/咪咕)
  xinghai: {
    url: _xd('X==JSAQpKD8cQyEISChFRnR8FOsoQfB6AEsIUzhcR'),
    enabled: true
  },


  // v1.7.12: 念心 API - 酷狗直链
  // 实测: 128k/320k/flac/hires 全部支持，返回完整直链
  nianxin: {
    url: _xd('X=1rCS0IV9tSNtdsWTVpX4xoDW8sNDBJAL9YSP9IK+1EDuBZK3B6AEsIUzhcR'),
    enabled: true
  },

  // QQ音乐专属配置
  qqDirect: {
    key: _d('=ElZalmdyZ3VSJ1Qhp1bJh3YwNXNxdXSHJVRCpXcYhTcjd0Z3UDMjdnTOB3QFh1Xj9VQa1mRmJ0QtxWRsV3a1JGM30iVrBHW2Uzbwg2TtZUbo50MmNDRwY3YD50MrNjNfx0XI9VU'),
    uin: _d('==ANxgTO5IjN3YzM'),
    enabled: true
  },
}

const SCRIPT_NAME = 'K×H测试'
const SCRIPT_VERSION = '1.7.17'
const SCRIPT_DESC = 'Koneko×HYW音源技术测试音源 - v1.7.10'
const DOWNLOAD_TYPE = '测试'
const SUPPORTED_SOURCES = ['wy', 'tx', 'kw', 'kg', 'mg']

const PLATFORM_NAMES = {
  wy: '网易云音乐', tx: 'QQ音乐', kw: '酷我音乐', kg: '酷狗音乐', mg: '咪咕音乐'
}

// 音质映射
const QMAP = {
  '128k': '128', '192k': '192', '320k': '320',
  'flac': 'flac', 'flac24bit': 'flac24bit',
  'hires': 'hires', 'atmos': 'atmos', 'atmos_plus': 'atmos_plus', 'master': 'master'
}

// 音质降级链
const QUALITY_FALLBACK = {
  'master':      ['master', 'hires', 'flac24bit', 'flac', '320k', '128k'],
  'hires':       ['hires', 'flac24bit', 'flac', '320k', '128k'],
  'flac24bit':   ['flac24bit', 'flac', '320k', '128k'],
  'flac':        ['flac', '320k', '128k'],
  'atmos':       ['atmos', 'master', 'flac', '320k', '128k'],
  'atmos_plus':  ['atmos_plus', 'atmos', 'master', 'flac', '320k', '128k'],
  '320k':        ['320k', '192k', '128k'],
  '192k':        ['192k', '320k', '128k'],
  '128k':        ['128k'],
}

// v1.7.0: 各平台实际支持音质（用于日志输出和初始化声明）
const PLATFORM_QUALITIES = {
  tx: { supported: ['128k', '320k', 'flac', 'hires', 'master', 'atmos', 'atmos_plus'], note: 'QQ专属支持全音质' },
  wy: { supported: ['128k', '320k', 'flac', 'hires', 'master'], note: 'chksz 支持 jymaster 超清母带' },
  kw: { supported: ['128k', '320k', 'flac', 'hires'], note: '妖狐搜索返回无损' },
  kg: { supported: ['128k', '320k', 'flac'], note: '妖狐搜索返回无损' },
  mg: { supported: ['128k', '320k', 'flac'], note: '本地API: PQ/HQ/SQ' },
}

// ========== 日志脱敏系统 (可逆编码) ==========
// 敏感信息用_e()编码后包裹在<<E:...>>中，普通用户看到的是乱码
// 拥有还原脚本+密钥的开发者可以解码还原
const _mask = (s) => {
  if (!s) return s
  let r = String(s)
  // 1. 脱敏URL中的敏感参数值 (key, token, contentId, copyrightId等)
  r = r.replace(/([?&](?:key|apikey|api_key|token|access_token|qm_keyst|qqmusic_key|psrf_qqaccess_token|contentId|copyrightId|songId|songmid)=)([^&\\s"'<>]+)/gi, (m, p1, p2) => p1 + '<<E:' + _e(p2) + '>>')
  // 2. 脱敏内部IP地址后两段
  r = r.replace(/(\\d{1,3}\\.\\d{1,3})\\.(\\d{1,3}\\.\\d{1,3})(:\\d+)?/g, (m, p1, p2, p3) => p1 + '.<<E:' + _e(p2) + '>>' + (p3 || ''))
  // 3. 脱敏完整音频URL路径 (保留域名，跳过已含<<E:>>标记的路径防止嵌套编码)
  r = r.replace(/(https?:\\/\\/[^/]+\\/)([^\\s"'<>]{15,})/g, (m, p1, p2) => p2.includes('<<E:') ? m : p1 + '<<E:' + _e(p2) + '>>')
  // 4. 脱敏contentId/copyrightId (URL参数和错误消息中均生效)
  r = r.replace(/(contentId[=:]\\s?)(\\d+)/gi, (m, p1, p2) => p1 + '<<E:' + _e(p2) + '>>')
  r = r.replace(/(copyrightId[=:]\\s?)(\\d+)/gi, (m, p1, p2) => p1 + '<<E:' + _e(p2) + '>>')
  // 5. 脱敏Cookie中的敏感值
  r = r.replace(/(qm_keyst=)([^;\\s<>]+)/gi, (m, p1, p2) => p1 + '<<E:' + _e(p2) + '>>')
  r = r.replace(/(uin=o)(\\d+)/gi, (m, p1, p2) => p1 + '<<E:' + _e(p2) + '>>')
  // 6. 脱敏purl路径
  r = r.replace(/(purl[=:]\\s?)([^\\s"'<>]{10,})/gi, (m, p1, p2) => p1 + '<<E:' + _e(p2) + '>>')
  return r
}

// 批量脱敏日志参数
const _maskArgs = (args) => args.map(a => {
  if (typeof a === 'string') return _mask(a)
  if (typeof a === 'object') {
    try { return _mask(JSON.stringify(a)) } catch (e) { return '[obj]' }
  }
  return a
})

// ========== 日志系统 (v1.7.6: 改用 SCRIPT_NAME) ==========
const _LOG_TAG = \`[\${SCRIPT_NAME}]\`
const log = {
  i: (...a) => { try { console.log(_LOG_TAG, ..._maskArgs(a)) } catch (e) {} },
  e: (...a) => { try { console.error(\`\${_LOG_TAG} ERR\`, ..._maskArgs(a)) } catch (e) {} },
  w: (...a) => { try { console.warn(\`\${_LOG_TAG} WARN\`, ..._maskArgs(a)) } catch (e) {} },
  d: (...a) => { try { console.debug(\`\${_LOG_TAG} DBG\`, ..._maskArgs(a)) } catch (e) {} },
  t: (level, ...a) => {
    try {
      const ts = new Date().toISOString().substring(11, 19)
      const fn = level === 'e' ? console.error : level === 'w' ? console.warn : console.log
      fn(\`[\${SCRIPT_NAME} \${ts}]\`, ..._maskArgs(a))
    } catch (e) {}
  },
}

// ========== HTTP工具 ==========
const DEFAULT_TIMEOUT = 4000

const http = (url, opts = {}) => new Promise((resolve, reject) => {
  const defaultOpts = {
    method: 'GET',
    timeout: DEFAULT_TIMEOUT,
    headers: { 'X-Client-Software': 'lx' }
  }
  const finalOpts = { ...defaultOpts, ...opts }
  log.d('HTTP', finalOpts.method, url.substring(0, 120))
  request(url, finalOpts, (err, resp) => {
    if (err) {
      log.d('HTTP错误:', err.message || err)
      return reject(new Error('请求错误: ' + (err.message || err)))
    }
    let body = resp?.body
    if (typeof body === 'string') {
      const trimmed = body.trim()
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try { body = JSON.parse(trimmed) } catch (e) { /* 保留原始字符串 */ }
      }
    }
    resolve({
      statusCode: resp?.statusCode ?? 0,
      headers: resp?.headers || {},
      body: body
    })
  })
})

const isValidJsonResponse = (resp) => {
  if (!resp || resp.statusCode >= 400) return false
  const body = resp.body
  if (!body) return false
  if (typeof body === 'object') return true
  if (typeof body === 'string') {
    const trimmed = body.trim().toLowerCase()
    if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) return false
    if (trimmed.includes('cloudflare') && trimmed.includes('challenge')) return false
    if (trimmed.includes('just a moment')) return false
  }
  return true
}

const fetchJSON = async (url, opts = {}) => {
  const resp = await http(url, opts)
  if (!isValidJsonResponse(resp)) {
    throw new Error('HTTP ' + resp.statusCode + ': ' + _mask(url).substring(0, 60))
  }
  let body = resp.body
  if (typeof body === 'string') {
    const trimmed = body.trim()
    try { body = JSON.parse(trimmed) } catch (e) {
      throw new Error('JSON解析失败: ' + _mask(trimmed).substring(0, 100))
    }
  }
  return body
}

const httpGet = async (url, params = {}) => {
  const queryStr = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null)
    .map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&')
  const sep = url.includes('?') ? '&' : '?'
  const fullUrl = url + (queryStr ? sep + queryStr : '')
  return fetchJSON(fullUrl, { method: 'GET', timeout: DEFAULT_TIMEOUT })
}

const httpPost = async (url, body = {}, timeout = DEFAULT_TIMEOUT) => {
  return fetchJSON(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
    timeout: timeout
  })
}

// 从歌曲信息中提取ID
const getId = (info) => {
  if (!info || typeof info !== 'object') return ''
  const id = info.songmid || info.songId || info.id || info.hash || info.rid || info.musicId || info.copyrightId || info.songid || info.mid || info.strMediaMid || info.FileHash || info.fileHash || info.copyrightid || ''
  if (id) return String(id)
  const src = info.source || ''
  switch (src) {
    case 'kg': return String(info.hash || info.FileHash || info.fileHash || info.songId || info.id || '')
    case 'tx': return String(info.songmid || info.strMediaMid || info.mid || info.songId || info.id || '')
    case 'wy': return String(info.songId || info.id || info.songmid || '')
    case 'kw': return String(info.songId || info.rid || info.musicId || info.id || info.songmid || '')
    case 'mg': return String(info.copyrightId || info.songId || info.songmid || info.id || '')
    default: return String(info.songId || info.songmid || info.id || info.hash || '')
  }
}

const isValidAudioUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false
  if (url.includes('404') && url.length < 50) return false
  const lower = url.toLowerCase()
  const audioPatterns = ['.mp3', '.flac', '.m4a', '.ogg', '.wav', 'music.126.net', 'qqmusic', 'kuwo.cn', 'kugou.com', 'migu', 'music']
  return audioPatterns.some(p => lower.includes(p))
}

const extractUrl = (data) => {
  if (!data) return ''
  if (typeof data === 'string') return data.startsWith('http') ? data : ''
  if (typeof data !== 'object') return ''
  if (typeof data.url === 'string' && data.url.startsWith('http')) return data.url
  if (data.data) {
    if (typeof data.data === 'string' && data.data.startsWith('http')) return data.data
    if (typeof data.data.url === 'string' && data.data.url.startsWith('http')) return data.data.url
    if (data.data.vipmusic && typeof data.data.vipmusic.url === 'string' && data.data.vipmusic.url.startsWith('http')) return data.data.vipmusic.url
    if (typeof data.data.play_url === 'string' && data.data.play_url.startsWith('http')) return data.data.play_url
    if (Array.isArray(data.data) && data.data.length > 0) {
      if (typeof data.data[0].url === 'string' && data.data[0].url.startsWith('http')) return data.data[0].url
      if (typeof data.data[0] === 'string' && data.data[0].startsWith('http')) return data.data[0]
    }
  }
  if ((data.code === 200 || data.code === 0 || data.status === 200) && data.data) {
    return extractUrl({ data: data.data })
  }
  if (data.text && typeof data.text === 'string') {
    const match = data.text.match(/https?:\\/\\/[^\\s"']+/)
    if (match) return match[0]
  }
  if (data.data && data.data.text && typeof data.data.text === 'string') {
    const match = data.data.text.match(/https?:\\/\\/[^\\s"']+/)
    if (match) return match[0]
  }
  return ''
}

// ========== API实现 ==========

// 1. 本地QQ (3035)
const getLocalQQ = async (info, q) => {
  const id = getId(info)
  if (!id) throw new Error('no id')
  const typeMap = { '128k': 'MP3_128', '192k': 'MP3_320', '320k': 'MP3_320', 'flac': 'FLAC', 'flac24bit': 'Master', 'hires': 'Master', 'master': 'Master' }
  log.d('本地QQ请求:', id, q)
  const data = await httpGet(\`\${API.localQQ.base}/song/urls\`, { mids: id, type: typeMap[q] || 'MP3_128' })
  const url = extractUrl(data) || (data && data.data && data.data[id] && data.data[id].url) || ''
  if (url) return url
  throw new Error('localQQ fail: ' + _mask(JSON.stringify(data)).substring(0, 100))
}

// 2. 本地网易 (3036)
const getLocalWy = async (info, q) => {
  const id = getId(info)
  if (!id) throw new Error('no id')
  const levelMap = { '128k': 'standard', '192k': 'exhigh', '320k': 'exhigh', 'flac': 'lossless', 'flac24bit': 'hires', 'hires': 'hires', 'master': 'jymaster' }
  log.d('本地网易请求:', id, q)
  // v1.7.5: 修复路由 /song -> /song/url/v1，注入 MUSIC_U cookie
  const data = await httpPost(\`\${API.localWy.base}/song/url/v1\`, {
    id: id,
    level: levelMap[q] || 'standard',
    encodeType: 'flac',
    cookie: API.neteaseCookie,
  })
  if (data && data.code === 200 && Array.isArray(data.data) && data.data[0] && data.data[0].url) {
    return data.data[0].url
  }
  const url = extractUrl(data)
  if (url) return url
  throw new Error('localWy fail: ' + _mask(JSON.stringify(data)).substring(0, 100))
}

// 3. Toubiec (网易)
const getToubiec = async (info, q) => {
  const id = getId(info)
  if (!id) throw new Error('no id')
  const levelMap = { '128k': 'standard', '192k': 'exhigh', '320k': 'exhigh', 'flac': 'lossless', 'flac24bit': 'hires' }
  log.d('Toubiec请求:', id, q)
  const data = await httpGet(\`\${API.toubiec.base}/song\`, { id: id, level: levelMap[q] || 'standard' })
  const url = extractUrl(data)
  if (url) return url
  throw new Error('toubiec fail')
}

// 4. FFAPI
const getFFAPI = async (info, q) => {
  const id = getId(info)
  const src = info.source
  if (!id) throw new Error('no id')
  let url = ''
  if (src === 'tx') url = \`https://y.qq.com/n/ryqq/songDetail/\${id}\`
  else if (src === 'wy') url = \`https://music.163.com/song?id=\${id}\`
  else if (src === 'kw') url = \`https://www.kuwo.cn/play_detail/\${id}\`
  else if (src === 'kg') url = \`https://www.kugou.com/song/#hash=\${id}\`
  else if (src === 'mg') url = \`https://music.migu.cn/v3/music/song/\${id}\`
  else throw new Error('unsupported src: ' + src)
  log.d('FFAPI请求:', src, id)
  const data = await httpGet(\`\${API.ffapi.base}/songurl\`, { url: url })
  const u = extractUrl(data)
  if (u) return u
  throw new Error('ffapi fail')
}

// 5. 妖狐 - 酷我 (搜索模式返回FLAC无损)
// v1.7.6: yunmge 酷我专用通道 (URL/key/token 已 _xd 加密)
//   返回 data.all_bitrates 数组，按音质选最佳 bitrate 取 play_url
// v1.7.8: 酷狗 yuafeng API (POST/GET, 需 apikey)
// 注意: apikey 从 USER_CONFIG.yuafeng_apikey 读取
const getYuafengKg = async (info, q) => {
  if (!API.yuafeng.apikey) {
    throw new Error('yuafengKg: 未配置 apikey')
  }
  const hash = info.hash || info.songmid || info.id || ''
  if (!hash) throw new Error('yuafengKg: no hash')
  log.d('yuafeng酷狗请求:', hash, q)
  const data = await httpGet(API.yuafeng.url, {
    apikey: API.yuafeng.apikey,
    hash: hash,
    msg: (info.songName || '') + ' ' + (info.singer || ''),
    n: 1,
  })
  if (data && data.code === 200) {
    const url = data.url || (data.data && data.data.url) || ''
    if (url && isValidAudioUrl(url)) {
      log.d('yuafeng酷狗成功:', q)
      return url
    }
  }
  throw new Error('yuafengKg fail: code=' + (data?.code ?? 'null'))
}

// v1.7.12: 念心酷狗 API (mcp.nianxinxz.com) - 直接返回 kuwo.cn 直链
// 实测: 支持 128k/320k/flac/hires，返回完整直链不需二次请求
const getNianxinKg = async (info, q) => {
  const hash = info.hash || info.songmid || info.id || ''
  if (!hash) throw new Error('nianxinKg: no hash')
  // 念心 level 映射（实测支持）
  const levelMap = {
    '128k': '128kmp3',
    '192k': '320kmp3',  // 没专门 192k，降级到 320k
    '320k': '320kmp3',
    'flac': '2000kflac',
    'flac24bit': '4000kflac',
    'hires': 'hires',
    'master': '4000kflac',  // 念心没有 master，用最高 4000kflac
    'atmos': '4000kflac',
    'atmos_plus': '4000kflac',
  }
  const level = levelMap[q] || '320kmp3'
  log.d('念心酷狗请求:', hash, q, '->', level)
  const data = await httpGet(API.nianxin.url, { id: hash, level: level }, 8000)
  // 返回: { code: 200, msg: '换源成功', url: '<直链>' }
  if (data && data.code === 200 && data.url) {
    log.d('念心酷狗成功:', q, '(level=' + level + ')')
    return data.url
  }
  throw new Error('nianxinKg fail: code=' + (data?.code ?? 'null') + ' msg=' + (data?.msg || '').substring(0, 60))
}

// v1.7.16: 残像 API (网易云)
// GET /api/wyymusic?token=<token>&msg=<keyword>&n=1&type=<quality>
// 或 GET /api/wyymusic?token=<token>&id=<songId>&type=<quality>
// 返回: { code: 200, data: { url, quality, cover, lyric, ... } }
const getCanxiang = async (info, q) => {
  const id = info.songId || info.id || info.songmid || ''
  const songName = info.songName || info.name || ''
  const singer = info.singer || ''
  
  // 音质映射
  const qMap = {
    '128k': '128k', '192k': '320k', '320k': '320k',
    'flac': 'flac', 'flac24bit': 'hires', 'hires': 'hires',
    'master': 'jymaster', 'atmos': 'jymaster', 'atmos_plus': 'jymaster',
  }
  const type = qMap[q] || '320k'
  
  log.d('残像请求:', id || (songName + singer), q, '->', type)
  
  // 优先用 id 直接调，没有 id 用 msg 搜索
  const params = { token: API.canxiang.token, type: type }
  if (id) {
    params.id = String(id)
  } else if (songName) {
    params.msg = songName + (singer ? ' ' + singer : '')
    params.n = 1
  } else {
    throw new Error('canxiang: no id and no songName')
  }
  
  const data = await httpGet(API.canxiang.url, params, 8000)
  
  if (data && data.code === 200 && data.data && data.data.url) {
    log.d('残像成功:', q, '(type=' + type + ', quality=' + (data.data.quality || '?') + ')')
    return data.data.url
  }
  throw new Error('canxiang fail: code=' + (data?.code ?? 'null') + ' msg=' + (data?.msg || '').substring(0, 60))
}

// v1.7.15: QQ 全音质 API (含 master)
// GET /api/song/url?mid={mid}&quality={128|320|flac|hires|master}
// 返回: { code: 0, data: { "<mid>": "<url>" } }
const getYgkingTx = async (info, q) => {
  const mid = info.songmid || info.strMediaMid || info.mediaMid || info.id || ''
  if (!mid) throw new Error('ygking: no mid')
  // 音质映射
  const qMap = {
    '128k': '128', '192k': '320', '320k': '320',
    'flac': 'flac', 'flac24bit': 'hires', 'hires': 'hires',
    'master': 'master', 'atmos': 'master', 'atmos_plus': 'master',
  }
  const quality = qMap[q] || '320'
  log.d('ygking QQ请求:', mid, q, '->', quality)
  const data = await httpGet(API.ygking.url, { mid: mid, quality: quality }, 8000)
  // 返回: { code: 0, data: { "<mid>": "<url>" } }
  if (data && data.code === 0 && data.data) {
    const url = data.data[mid] || data.data[Object.keys(data.data)[0]] || ''
    if (url && isValidAudioUrl(url)) {
      log.d('ygking QQ成功:', q, '(quality=' + quality + ')')
      return url
    }
  }
  throw new Error('ygking fail: code=' + (data?.code ?? 'null'))
}

// v1.7.15: 星海聚合 API (酷我/酷狗/咪咕)
// GET /lx/api/?source={kw|kg|migu}&name={name}&songmid={id}&quality={quality}
// 返回: { code: 200, url: "<直链>" }
const getXinghai = async (source, info, q) => {
  const id = source === 'kg' ? (info.hash || info.songmid || info.id || '')
           : source === 'migu' ? (info.songId || info.contentId || info.id || '')
           : (info.songmid || info.rid || info.id || '')
  if (!id) throw new Error('xinghai: no id for source=' + source)
  const songName = info.songName || info.name || ''
  const singer = info.singer || ''
  const name = songName + (singer ? ' ' + singer : '')
  // 音质映射
  const qMap = {
    '128k': '128kmp3', '192k': '320kmp3', '320k': '320kmp3',
    'flac': 'flac', 'flac24bit': 'hires', 'hires': 'hires',
    'master': 'flac', 'atmos': 'flac', 'atmos_plus': 'flac',
  }
  const quality = qMap[q] || '320kmp3'
  log.d('星海请求:', source, id, q, '->', quality)
  const data = await httpGet(API.xinghai.url, {
    source: source, name: name, songmid: String(id), quality: quality,
  }, 8000)
  if (data && data.code === 200 && data.url) {
    log.d('星海成功:', source, q)
    return data.url
  }
  throw new Error('xinghai fail: code=' + (data?.code ?? 'null') + ' msg=' + (data?.message || '').substring(0, 60))
}

const getXinghaiKw = (info, q) => getXinghai('kw', info, q)
const getXinghaiKg = (info, q) => getXinghai('kg', info, q)
const getXinghaiMg = (info, q) => getXinghai('migu', info, q)

const getYunmgeKw = async (info, q) => {
  const id = getId(info)
  if (!id) throw new Error('yunmgeKw: no id')

  // 音质 → bitrate 映射（yunmge 返回的 bitrate 是数字: 128/192/320/2000/4000）
  const brMap = {
    '128k': 128, '192k': 192, '320k': 320,
    'flac': 2000, 'flac24bit': 2000, 'hires': 4000,
    'atmos': 4000, 'atmos_plus': 4000, 'master': 4000
  }
  // 音质降级链（yunmge 视角）
  const brFallback = {
    '4000': [4000, 2000, 320, 192, 128],
    '2000': [2000, 320, 192, 128],
    '320':  [320, 192, 128],
    '192':  [192, 128],
    '128':  [128],
  }
  const wantBr = brMap[q] || 320
  const tryBrs = brFallback[String(wantBr)] || [wantBr]

  log.d('yunmge酷我请求:', id, q, '->', wantBr)
  const data = await httpGet(API.yunmge.url, {
    key: API.yunmge.key,
    token: API.yunmge.token,
    id: id,
  }, 8000)  // v1.7.9: 8s 超时，避免竞速被 abort

  if (!data || data.code !== 200 || !data.data) {
    throw new Error('yunmgeKw fail: code=' + (data?.code ?? 'null') + ' msg=' + _mask(JSON.stringify(data)).substring(0, 80))
  }

  const allBrs = data.data.all_bitrates || []
  if (allBrs.length === 0) {
    throw new Error('yunmgeKw: no all_bitrates')
  }

  // 按降级链选最佳 bitrate
  for (const br of tryBrs) {
    const item = allBrs.find(b => b.bitrate === br || String(b.bitrate) === String(br))
    if (item && item.play_url) {
      log.d('yunmge酷我成功:', 'bitrate=' + item.bitrate, 'label=' + (item.label || ''))
      return item.play_url
    }
  }

  // 兜底：返回第一个可用 url
  for (const item of allBrs) {
    if (item.play_url) {
      log.d('yunmge酷我兜底返回:', 'bitrate=' + item.bitrate)
      return item.play_url
    }
  }

  throw new Error('yunmgeKw: all play_url empty')
}

const getYaohuKw = async (info, q) => {
  const songName = info.songName || info.name || ''
  const singer = info.singer || ''
  if (songName) {
    const searchKey = songName + singer
    log.d('妖狐酷我搜索:', searchKey)
    const data = await httpGet(\`\${API.yaohu.base}/kuwo\`, {
      key: API.yaohu.key, action: 'search', msg: searchKey, n: 1
    })
    const vm = data?.data?.vipmusic || {}
    const url = vm.url || ''
    if (url && isValidAudioUrl(url)) {
      log.d('妖狐酷我搜索成功, level:', vm.level, 'bitrate:', vm.bitrate)
      return url
    }
  }
  const id = getId(info)
  if (!id) throw new Error('yaohuKw: no id and no songName')
  log.d('妖狐酷我ID解析:', id)
  const data = await httpGet(\`\${API.yaohu.base}/kuwo\`, {
    key: API.yaohu.key, action: 'song', id: id, size: 'lossless'
  })
  const url = extractUrl(data)
  if (url) return url
  throw new Error('yaohuKw fail: ' + _mask(JSON.stringify(data)).substring(0, 100))
}

// 5b. 妖狐 - 酷狗
const getYaohuKg = async (info, q) => {
  const songName = info.songName || info.name || ''
  const singer = info.singer || ''
  if (!songName) throw new Error('no songName for kg search')
  const qualityMap = { '128k': '128', '192k': '320', '320k': '320', 'flac': 'flac', 'flac24bit': 'high', 'hires': 'high', 'master': 'high' }
  const quality = qualityMap[q] || '128'
  const searchKey = songName + singer
  log.d('妖狐酷狗请求:', searchKey, quality)
  const data = await httpGet(\`\${API.yaohu.base}/kg\`, {
    key: API.yaohu.key, msg: searchKey, n: 1, quality: quality
  })
  const playUrl = data?.data?.play_url || ''
  if (playUrl && isValidAudioUrl(playUrl)) return playUrl
  const url = extractUrl(data)
  if (url) return url
  throw new Error('yaohuKg fail: ' + _mask(JSON.stringify(data)).substring(0, 100))
}

// 5c. 妖狐 - QQ/网易通用
const getYaohu = async (info, q) => {
  const src = info.source
  const songName = info.songName || info.name || ''
  const singer = info.singer || ''
  if (!songName) throw new Error('no songName')
  const pathMap = { wy: 'wy', tx: 'qq' }
  const path = pathMap[src]
  if (!path) throw new Error('unsupported src: ' + src)
  const searchKey = songName + singer
  log.d('妖狐通用请求:', path, searchKey)
  const data = await httpGet(\`\${API.yaohu.base}/\${path}\`, {
    key: API.yaohu.key, msg: searchKey, n: 1
  })
  const musicUrl = data?.data?.musicurl || ''
  if (musicUrl && isValidAudioUrl(musicUrl)) return musicUrl
  const url = extractUrl(data)
  if (url) return url
  throw new Error('yaohu fail: ' + _mask(JSON.stringify(data)).substring(0, 100))
}

// 5d. 妖狐 - 咪咕 (搜索模式)
// v1.7.10: 只有 id 没歌名时，先调妖狐搜索 API 拿到歌曲名再请求 URL
const getYaohuMg = async (info, q) => {
  let songName = info.songName || info.name || ''
  const singer = info.singer || ''
  const id = getId(info)

  // v1.7.10: 如果只有 id 没歌名，用 id 调搜索 API 拿歌名
  if (!songName && id) {
    log.d('妖狐咪咕: 无歌名，用 id 搜索获取:', id)
    try {
      const searchData = await httpGet(\`\${API.yaohuMg.base}\`, {
        key: API.yaohu.key, msg: String(id), n: 1
      })
      const song = searchData?.data?.vipmusic || searchData?.data?.[0] || null
      if (song && (song.songName || song.name)) {
        songName = song.songName || song.name
        log.d('妖狐咪咕: 通过 id 搜索到歌名:', songName)
      }
    } catch (e) {
      log.d('妖狐咪咕: id 搜索失败:', e.message)
    }
  }

  if (!songName) throw new Error('yaohuMg: 无歌名且 id 搜索失败')
  const searchKey = songName + (singer ? ' ' + singer : '')
  log.d('妖狐咪咕请求:', searchKey)
  const data = await httpGet(\`\${API.yaohuMg.base}\`, {
    key: API.yaohu.key, msg: searchKey, n: 1
  })
  const url = extractUrl(data)
  if (url) return url
  throw new Error('yaohuMg fail: ' + _mask(JSON.stringify(data)).substring(0, 100))
}

// v1.7.0: 咪咕本地API (3037) - 快速返回模式
// 改进点:
//   1. 优先健康检查(缓存60s)，API不可达时快速跳过
//   2. 直接尝试请求音质，失败立即PQ兜底，不逐层降级
//   3. 日志输出实际支持音质(128k/320k/flac)
const _miguHealthCache = { ok: null, ts: 0 }
const MIGU_HEALTH_TTL = 60000

const checkMiguHealth = async () => {
  const now = Date.now()
  if (_miguHealthCache.ok !== null && now - _miguHealthCache.ts < MIGU_HEALTH_TTL) {
    return _miguHealthCache.ok
  }
  try {
    const resp = await http(\`\${API.miguLocal.base}/api/search?text=test&page=1&size=1\`, { timeout: 2000 })
    _miguHealthCache.ok = isValidJsonResponse(resp)
    _miguHealthCache.ts = now
    log.d('咪咕API健康检查:', _miguHealthCache.ok ? '正常' : '异常')
    return _miguHealthCache.ok
  } catch (e) {
    _miguHealthCache.ok = false
    _miguHealthCache.ts = now
    log.d('咪咕API健康检查: 异常', e.message)
    return false
  }
}

const getMiguLocal = async (info, q) => {
  // v1.7.0: 支持的音质 (本地API toneFlag: PQ=128k, HQ=320k, SQ=无损FLAC)
  const supportedQ = ['128k', '320k', 'flac']
  log.d('咪咕支持音质:', supportedQ.join('/'), '| 请求音质:', q)

  // v1.7.0: 优先健康检查
  const healthy = await checkMiguHealth()
  if (!healthy) {
    throw new Error('miguLocal: API不可达(健康检查失败)')
  }

  const songName = info.songName || info.name || ''
  const singer = info.singer || ''
  let contentId = ''
  let copyrightId = ''

  const rawId = getId(info)
  if (rawId) {
    if (rawId.length > 15) {
      contentId = rawId
    } else if (rawId.length >= 8 && rawId.length <= 14) {
      copyrightId = rawId
    } else {
      contentId = info.contentId || rawId
      copyrightId = info.copyrightId || info.copyrightid || ''
    }
  }
  contentId = info.contentId || contentId
  copyrightId = info.copyrightId || info.copyrightid || copyrightId

  log.d('咪咕本地(3037):', songName, 'contentId: ' + contentId, 'copyrightId: ' + copyrightId)

  // 如果没有contentId，搜索获取
  if (!contentId) {
    if (!songName) throw new Error('miguLocal: 无contentId且无songName')
    const searchKey = songName + (singer ? ' ' + singer : '')
    log.d('咪咕本地搜索:', searchKey)
    const searchData = await httpGet(\`\${API.miguLocal.base}/api/search\`, { text: searchKey, page: 1, size: 5 })
    if (searchData && searchData.success && searchData.data && searchData.data.items) {
      const items = searchData.data.items
      let matched = null
      if (copyrightId) {
        matched = items.find(it => it.song && (it.song.copyrightId === copyrightId))
      }
      if (!matched && items.length > 0) {
        matched = items[0]
      }
      if (matched && matched.song) {
        contentId = matched.song.contentId || ''
        copyrightId = copyrightId || matched.song.copyrightId || ''
        log.d('咪咕搜索匹配:', matched.song.songName, 'contentId: ' + contentId)
      }
    }
  }

  if (!contentId) {
    throw new Error('miguLocal: 无法获取contentId')
  }

  // 音质映射
  const toneFlagMap = { '128k': 'PQ', '192k': 'HQ', '320k': 'HQ', 'flac': 'SQ', 'flac24bit': 'ZQ', 'hires': 'ZQ' }
  const toneFlag = toneFlagMap[q] || 'PQ'

  // v1.7.0: 快速返回 - 内部URL请求函数
  const tryGetUrl = async (flag) => {
    const url = \`\${API.miguLocal.base}/api/url/h5v2.4?contentId=\${contentId}&copyrightId=\${copyrightId || ''}&resourceType=2&toneFlag=\${flag}\`
    const data = await httpGet(url)
    if (data && data.success && data.data && data.data.url && typeof data.data.url === 'string') {
      return data.data.url
    }
    const u = extractUrl(data)
    if (u) return u
    return ''
  }

  // v1.7.0: 直接尝试请求音质
  let url = await tryGetUrl(toneFlag)
  if (url) {
    log.d('咪咕本地成功:', q, '(toneFlag=' + toneFlag + ')', url.substring(0, 60))
    return url
  }

  // v1.7.0: 快速兜底 - 直接尝试PQ(128k)，不走逐层降级
  if (q !== '128k') {
    log.d('咪咕快速兜底: 请求音质', q, '失败，直接尝试PQ(128k)')
    url = await tryGetUrl('PQ')
    if (url) {
      log.d('咪咕兜底成功(PQ/128k):', url.substring(0, 60))
      return url
    }
  }

  throw new Error(_mask('miguLocal fail: contentId=' + contentId + ' toneFlag=' + toneFlag))
}

// 6. 溯音QQ
const getSuyinQQ = async (info, q) => {
  const id = getId(info)
  if (!id) throw new Error('no id')
  const brMap = { '128k': 7, '192k': 5, '320k': 5, 'flac': 4, 'hires': 3, 'flac24bit': 1, 'master': 1 }
  log.d('溯音QQ请求:', id, q)
  const data = await httpGet(API.suyinQQ.base, { key: API.suyinQQ.key, type: 'json', br: brMap[q] || 7, n: 1, mid: id })
  const url = extractUrl(data)
  if (url) return url
  throw new Error('suyinQQ fail')
}

// 7. 溯音网易
const getSuyinWy = async (info, q) => {
  const id = getId(info)
  if (!id) throw new Error('no id')
  const levelMap = { '128k': 'standard', '192k': 'exhigh', '320k': 'exhigh', 'flac': 'lossless', 'flac24bit': 'hires', 'hires': 'hires', 'master': 'jymaster' }
  log.d('溯音网易请求:', id, q)
  const data = await httpGet(API.suyinWy.base, { key: API.suyinWy.key, type: 'json', level: levelMap[q] || 'standard', n: 1, id: id })
  const url = extractUrl(data)
  if (url) return url
  throw new Error('suyinWy fail')
}

// 8. 溯音酷我
const getSuyinKw = async (info, q) => {
  const id = getId(info)
  if (!id) throw new Error('no id')
  const brMap = { '128k': 7, '192k': 5, '320k': 5, 'flac': 1, 'flac24bit': 1, 'hires': 1 }
  log.d('溯音酷我请求:', id, q)
  const data = await httpGet(API.suyinKw.base, { key: API.suyinKw.key, type: 'json', br: brMap[q] || 7, n: 1, id: id })
  const url = extractUrl(data)
  if (url) return url
  throw new Error('suyinKw fail')
}

// 10. cyapi (迟言API)
const getCyapi = async (info, q) => {
  const src = info.source
  const id = getId(info)
  if (!id && src !== 'wy') throw new Error('cyapi: no id')

  if (src === 'tx') {
    log.d('cyapi QQ请求 mid:', id)
    const data = await httpGet(API.cyapi.qq, { apikey: API.cyapi.key, type: 'json', mid: id })
    if (data && data.url && typeof data.url === 'string' && data.url.startsWith('http')) {
      return data.url
    }
    throw new Error('cyapi QQ fail: no url field')
  } else if (src === 'wy') {
    const songName = info.songName || info.name || ''
    const singer = info.singer || ''
    if (!songName) throw new Error('cyapi WY: no songName')
    const searchKey = songName + (singer ? ' ' + singer : '')
    log.d('cyapi 网易请求:', searchKey)
    const data = await httpGet(API.cyapi.wy, { apikey: API.cyapi.key, msg: searchKey, n: 1, type: 'json' })
    if (data && data.url && typeof data.url === 'string' && data.url.startsWith('http')) {
      return data.url
    }
    throw new Error('cyapi WY fail: no url field')
  }
  throw new Error('cyapi: unsupported src: ' + src)
}

// 12. chksz (v1.7.11: 修复路径 + level 映射，支持 master)
// 玉宁熙音源同款用法
// level: standard/exhigh/lossless/hires/jymaster(超清母带)
const getChksz = async (info, q) => {
  const id = getId(info)
  if (!id) throw new Error('no id')
  // v1.7.11: 完整的网易云 level 映射（含 master/jymaster）
  const levelMap = {
    '128k': 'standard',
    '192k': 'exhigh',
    '320k': 'exhigh',
    'flac': 'lossless',
    'flac24bit': 'hires',
    'hires': 'hires',
    'master': 'jymaster',     // 超清母带
    'atmos': 'jymaster',
    'atmos_plus': 'jymaster',
  }
  const level = levelMap[q] || 'standard'
  log.d('chksz请求:', id, q, '->', level)
  // v1.7.11: 路径 /music/wy -> /api/163_music (玉宁熙用法)
  const data = await httpGet(\`\${API.chksz.base}/api/163_music\`, { id: id, level: level })
  // 返回结构: { code: 200, data: { url: '...' } }
  if (data && data.code === 200 && data.data && data.data.url) {
    log.d('chksz成功:', q, '(level=' + level + ')')
    return data.data.url
  }
  // 兼容旧结构
  const url = extractUrl(data)
  if (url) return url
  throw new Error('chksz fail: code=' + (data?.code ?? 'null'))
}

// 17. fish-music
const getFish = async (info, q) => {
  const id = getId(info)
  const src = info.source
  if (!id) throw new Error('no id')
  log.d('fish请求:', src, id)
  const data = await httpGet(\`\${API.fish.base}/\${src}/song\`, { id: id })
  const url = extractUrl(data)
  if (url) return url
  throw new Error('fish fail')
}

// 18. HYWmusic
const getHYW = async (info, q) => {
  const id = getId(info)
  if (!id) throw new Error('no id')
  log.d('HYW请求:', id)
  const data = await httpGet(\`\${API.hywmusic.base}/api/music\`, { mid: id })
  const url = extractUrl(data)
  if (url) return url
  throw new Error('hyw fail')
}

// 20. 玉宁熙 (yuafeng/枫雨API)
const getYuafeng = async (info, q) => {
  const src = info.source
  const songName = info.songName || info.name || ''
  const singer = info.singer || ''
  if (!songName) throw new Error('yuafeng: no songName')

  const endpointMap = {
    wy: 'wymusic', tx: 'qqmusic', kw: 'kwmusic',
    kg: 'kgmusic', mg: 'mgmusic'
  }
  const endpoint = endpointMap[src]
  if (!endpoint) throw new Error('yuafeng: unsupported src: ' + src)

  const typeMap = {
    '128k': '1', '192k': '2', '320k': '2',
    'flac': '4', 'flac24bit': '4', 'hires': '4',
    'master': '4', 'atmos': '4', 'atmos_plus': '4'
  }
  const type = typeMap[q] || '1'

  const searchKey = songName + (singer ? ' ' + singer : '')
  log.d('玉宁熙请求:', endpoint, searchKey, 'type=' + type)

  const data = await httpGet(\`\${API.yuningxi.base}/API/\${endpoint}.php\`, {
    apikey: API.yuningxi.key, msg: searchKey, n: 1, type: type
  })

  if (data && data.code === 0 && data.data) {
    const musicUrl = data.data.music
    if (musicUrl && typeof musicUrl === 'string' && musicUrl.startsWith('http')) {
      log.d('玉宁熙成功:', endpoint, musicUrl.substring(0, 60))
      return musicUrl
    }
    if (src === 'mg' && data.data.copyrightId && data.data.id) {
      log.d('玉宁熙咪咕: 搜索成功但直链空, copyrightId=' + data.data.copyrightId)
      throw new Error(_mask('yuafeng mg: 直链为空 copyrightId=' + String(data.data.copyrightId)))
    }
  }

  throw new Error('yuafeng fail: code=' + (data?.code ?? 'null') + ' msg=' + (data?.msg || '').substring(0, 60))
}

// v1.7.0: QQ音乐专属接口 - 3重策略
//   策略A: ut.y.qq.com (测试网关) CgiGetHotVkey/GetEVkey - 无VIP校验
//   策略B: u.y.qq.com (生产网关) platform=23 + 双songmid - VIP校验宽松
//   策略C: ut.y.qq.com 带Cookie+guid增强版
const getQQExploit = async (info, q) => {
  const songmid = getId(info)
  if (!songmid) throw new Error('QQ专属: no songmid')

  const mediaMid = info.mediaMid || info.strMediaMid || info.media_mid || info.strmediamid || ''

  // 音质前缀映射
  const qualityPrefix = {
    '128k': 'M500', '192k': 'M800', '320k': 'M800',
    'flac': 'F000', 'flac24bit': 'RS01', 'hires': 'RS01',
    'atmos': 'atmosphere', 'atmos_plus': 'atmosphere',
    'master': 'AIM00'
  }
  const prefix = qualityPrefix[q] || 'M800'

  // 文件扩展名
  const extMap = {
    'M500': 'mp3', 'M800': 'mp3',
    'F000': 'flac', 'RS01': 'flac', 'RS02': 'flac',
    'AIM00': 'mflac', 'atmosphere': 'flac'
  }
  const ext = extMap[prefix] || 'mp3'

  // filename中的mid: 优先用mediaMid(命中率更高), 没有则用songmid
  const midForFile = mediaMid || songmid
  const qqKey = API.qqDirect.key
  const qqUin = API.qqDirect.uin

  // v1.7.2: 构建完整Cookie，携带uin+qm_keyst+pgv_pvid等字段，提高专属成功率
  const pgv_pvid = Math.floor(Math.random() * 10000000000).toString()
  const qqCookie = \`qm_keyst=\${qqKey}; uin=o\${qqUin}; pgv_pvid=\${pgv_pvid}; qqmusic_key=\${qqKey}; qqmusic_uin=o\${qqUin}; psrf_qqaccess_token=\${qqKey}; ts_uid=\${pgv_pvid}; psi=\${pgv_pvid}\`

  // ========== 策略A: ut.y.qq.com 专属 (CgiGetHotVkey/GetEVkey) ==========
  const filenameA = \`\${prefix}\${midForFile}.\${ext}\`
  const bodyA = {
    comm: { ct: 19, cv: 0, guid: pgv_pvid, tmeAppID: 'qqmusic', qq: qqUin },
    hot: {
      method: 'CgiGetHotVkey',
      module: 'music.vkey.GetEVkey',
      param: { filename: [filenameA], songmid: [songmid] }
    },
    ekey: {
      method: 'GetEkey',
      module: 'music.vkey.GetEVkey',
      param: { finfo: [{ filename: filenameA, mid: midForFile || '0' }] }
    }
  }

  try {
    log.d('QQ专属(ut)请求:', songmid, prefix, filenameA)
    const resp = await http('https://ut.y.qq.com/cgi-bin/musicu.fcg', {
      method: 'POST',
      timeout: DEFAULT_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://y.qq.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': qqCookie
      },
      body: JSON.stringify(bodyA)
    })

    if (isValidJsonResponse(resp)) {
      const data = typeof resp.body === 'string' ? JSON.parse(resp.body) : resp.body
      const urls = data?.hot?.data?.urls || []
      if (urls.length > 0 && urls[0].purl) {
        const sip = 'https://dl.stream.qqmusic.qq.com/'
        log.d('QQ专属(ut)成功:', prefix, 'purl=' + urls[0].purl.substring(0, 60))
        return \`\${sip}\${urls[0].purl}\`
      }
      log.d('QQ专属(ut)无purl:', JSON.stringify(data?.hot?.data || {}).substring(0, 100))
    }
  } catch (e) {
    log.d('QQ专属(ut)失败:', e.message)
  }

  // ========== 策略B: u.y.qq.com platform=23 绕过 (CgiGetVkey) ==========
  // v1.7.2: 新增专属uin变体，携带完整Cookie
  const variants = [
    { name: '双songmid+专属uin', filename: \`\${prefix}\${songmid}\${songmid}.\${ext}\`, uin: qqUin, loginflag: 1 },
    { name: '单songmid+专属uin', filename: \`\${prefix}\${songmid}.\${ext}\`, uin: qqUin, loginflag: 1 },
    { name: '双songmid+空uin', filename: \`\${prefix}\${songmid}\${songmid}.\${ext}\`, uin: '', loginflag: 1 },
    { name: '单songmid+空uin', filename: \`\${prefix}\${songmid}.\${ext}\`, uin: '', loginflag: 1 },
  ]

  for (const v of variants) {
    try {
      const param = {
        filename: [v.filename],
        songmid: [songmid],
        songtype: [0],
        uin: v.uin,
        loginflag: v.loginflag,
        platform: '23',
        firstlogin: 1,
        newver: 1,
        nohash: 0,
        cms: 0,
      }
      const apiData = JSON.stringify({
        comm: { uin: v.uin ? parseInt(v.uin) : 0, format: 'json', ct: 23, cv: 0, ...(v.uin ? { qq: v.uin } : {}) },
        req_0: { module: 'vkey.GetVkeyServer', method: 'CgiGetVkey', param }
      })
      const url = \`https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&data=\${encodeURIComponent(apiData)}\`
      log.d('QQ专属(u,p23)请求:', v.name, songmid, prefix)
      const resp = await http(url, {
        method: 'GET',
        timeout: DEFAULT_TIMEOUT,
        headers: {
          'Referer': 'https://y.qq.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Cookie': qqCookie
        }
      })

      if (isValidJsonResponse(resp)) {
        const data = typeof resp.body === 'string' ? JSON.parse(resp.body) : resp.body
        const songInfo = data?.req_0?.data?.midurlinfo?.[0]
        if (data?.code === 0 && songInfo?.purl) {
          const sip = data.req_0?.data?.sip?.[0] || 'https://dl.stream.qqmusic.qq.com/'
          log.d('QQ专属(u,p23)成功:', v.name, prefix)
          return \`\${sip}\${songInfo.purl}\`
        }
      }
    } catch (e) {
      log.d(\`QQ专属(u,p23) \${v.name}失败:\`, e.message)
    }
  }

  // ========== 策略C: ut.y.qq.com 带Cookie+guid专属 (增强版) ==========
  const bodyC = {
    comm: {
      ct: 19, cv: 0,
      guid: pgv_pvid,
      tmeAppID: 'qqmusic', qq: qqUin
    },
    hot: {
      method: 'CgiGetHotVkey',
      module: 'music.vkey.GetEVkey',
      param: { filename: [filenameA], songmid: [songmid] }
    }
  }

  try {
    log.d('QQ专属(ut+key)请求:', songmid, prefix)
    const resp = await http('https://ut.y.qq.com/cgi-bin/musicu.fcg', {
      method: 'POST',
      timeout: DEFAULT_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://y.qq.com/',
        'User-Agent': 'Mozilla/5.0 QQMusic/2201',
        'Cookie': qqCookie
      },
      body: JSON.stringify(bodyC)
    })

    if (isValidJsonResponse(resp)) {
      const data = typeof resp.body === 'string' ? JSON.parse(resp.body) : resp.body
      const urls = data?.hot?.data?.urls || []
      if (urls.length > 0 && urls[0].purl) {
        const sip = 'https://dl.stream.qqmusic.qq.com/'
        log.d('QQ专属(ut+key)成功:', prefix)
        return \`\${sip}\${urls[0].purl}\`
      }
    }
  } catch (e) {
    log.d('QQ专属(ut+key)失败:', e.message)
  }

  throw new Error('QQ专属全部失败: ' + _mask(songmid) + ' ' + prefix)
}

// ========== API分组与优先级配置 ==========
const API_GROUPS = {
  // QQ音乐 (v1.7.15: ygking 优先)
  tx: [
    // Group 0: QQ 全音质 (v1.7.15, 最高优先级，含 master)
    [
      { name: 'ygkingQQ', fn: getYgkingTx },
    ],
    // Group 1: QQ专属接口(最高优先级)
    [
      { name: 'QQ专属', fn: getQQExploit },
    ],
    // Group 2: 快速第三方API（并行）
    [
      { name: 'cyapi QQ', fn: getCyapi },
      { name: '溯音QQ', fn: getSuyinQQ },
      { name: 'FFAPI', fn: getFFAPI },
    ],
    // Group 3: 搜索型API（并行）
    [
      { name: '妖狐QQ', fn: getYaohu },
      { name: '玉宁熙TX', fn: getYuafeng },
    ],
    // Group 4: 本地API兜底
    [
      { name: '本地QQ(3035)', fn: getLocalQQ },
      { name: 'HYW', fn: getHYW },
      { name: 'fish', fn: getFish },
    ],
  ],
  // 网易云 (v1.7.16: 残像提到第一组，支持 master)
  wy: [
    [
      { name: '残像WY', fn: getCanxiang },  // v1.7.16: 残像，支持 master/jymaster
      { name: 'chksz', fn: getChksz },
      { name: '本地网易(3036+cookie)', fn: getLocalWy },
      { name: '妖狐WY', fn: getYaohu },
      { name: 'cyapi 网易', fn: getCyapi },
      { name: '溯音网易', fn: getSuyinWy },
      { name: 'Toubiec', fn: getToubiec },
    ],
    [
      { name: '玉宁熙WY', fn: getYuafeng },
      { name: 'FFAPI', fn: getFFAPI },
    ],
    [
      { name: 'HYW', fn: getHYW },
      { name: 'fish', fn: getFish },
    ],
  ],
  // 酷我 (v1.7.15: 星海)
  kw: [
    [
      { name: '星海酷我', fn: getXinghaiKw },  // v1.7.15: 星海
      { name: 'yunmge酷我', fn: getYunmgeKw },
      { name: '妖狐酷我', fn: getYaohuKw },
      { name: '溯音酷我', fn: getSuyinKw },
    ],
    [
      { name: '玉宁熙KW', fn: getYuafeng },
      { name: 'FFAPI', fn: getFFAPI },
    ],
    [
      { name: 'fish', fn: getFish },
    ],
  ],
  // 酷狗 (v1.7.15: 星海)
  kg: [
    [
      { name: '星海酷狗', fn: getXinghaiKg },  // v1.7.15: 星海
      { name: '念心酷狗', fn: getNianxinKg },
      { name: 'yuafeng酷狗', fn: getYuafengKg },
      { name: '妖狐酷狗', fn: getYaohuKg },
    ],
    [
      { name: '玉宁熙KG', fn: getYuafeng },
      { name: 'FFAPI', fn: getFFAPI },
    ],
    [
      { name: 'fish', fn: getFish },
    ],
  ],
  // 咪咕 (v1.7.15: 星海提到第一组)
  mg: [
    [
      { name: '星海咪咕', fn: getXinghaiMg },  // v1.7.15: 星海
      { name: '咪咕本地(3037)', fn: getMiguLocal },
    ],
    // Group 2: 兜底
    [
      { name: '妖狐咪咕', fn: getYaohuMg },
      { name: 'FFAPI', fn: getFFAPI },
      { name: 'fish', fn: getFish },
    ],
  ],
}

// 并行竞速
const raceApis = async (apis, info, quality) => {
  if (!apis || apis.length === 0) return null

  return new Promise((resolve) => {
    let remaining = apis.length
    let settled = false

    apis.forEach(async (api) => {
      try {
        const url = await api.fn(info, quality)
        if (url && isValidAudioUrl(url)) {
          if (!settled) {
            settled = true
            resolve({ url, name: api.name })
          }
          return
        }
      } catch (e) {
        log.d(\`[竞速] \${api.name} 失败:\`, e.message)
      }
      remaining--
      if (remaining === 0 && !settled) {
        settled = true
        resolve(null)
      }
    })
  })
}

// ========== 聚合获取URL ==========
const getMusicUrl = async (source, musicInfo, quality) => {
  log.t('i', '=== 获取URL开始 v1.7.1 ===')
  log.t('i', '平台:', PLATFORM_NAMES[source] || source, '| 请求音质:', quality, '| 歌曲ID:', getId(musicInfo))

  // v1.7.0: 输出平台支持音质
  const pq = PLATFORM_QUALITIES[source]
  if (pq) {
    log.t('i', '平台支持音质:', pq.supported.join('/'), '(' + pq.note + ')')
  }

  if (!SUPPORTED_SOURCES.includes(source)) {
    log.t('e', '不支持的平台:', source)
    throw new Error('不支持的平台: ' + source)
  }

  // 获取音质降级链
  const fallbackChain = QUALITY_FALLBACK[quality] || [quality]
  log.t('i', '音质降级链:', fallbackChain.join(' -> '))

  const groups = API_GROUPS[source]
  if (!groups || groups.length === 0) {
    throw new Error('未配置API组: ' + source)
  }

  // v1.7.0: 咪咕快速返回优化
  // 对于咪咕，不使用逐层降级，直接尝试请求音质+PQ兜底
  if (source === 'mg') {
    log.t('i', '咪咕快速模式: 不逐层降级，直接尝试+PQ兜底')
    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi]
      log.t('i', \`[音质\${quality}] 组\${gi+1}/\${groups.length} 并行尝试 \${group.length} 个API: \${group.map(a => a.name).join(', ')}\`)
      const result = await raceApis(group, musicInfo, quality)
      if (result && result.url) {
        log.t('i', \`✓ 成功! 来源:\${result.name} -> \${result.url.substring(0, 80)}...\`)
        return result.url
      }
      log.t('w', \`[音质\${quality}] 组\${gi+1} 全部失败\`)
    }
    log.t('e', '=== 咪咕所有API均失败 ===')
    throw new Error('咪咕所有API均失败 (v1.7.1 快速模式)')
  }

  // 其他平台: 按音质降级链逐档尝试
  for (let qi = 0; qi < fallbackChain.length; qi++) {
    const currentQ = fallbackChain[qi]
    const isLastQuality = (qi === fallbackChain.length - 1)

    if (qi > 0) {
      log.t('w', \`音质 \${fallbackChain[qi-1]} 全部失败，降级到 \${currentQ}\`)
    }

    for (let gi = 0; gi < groups.length; gi++) {
      const group = groups[gi]
      const isLocalGroup = (gi === groups.length - 1)

      if (isLocalGroup && !isLastQuality && qi > 0) {
        continue
      }

      log.t('i', \`[音质\${currentQ}] 组\${gi+1}/\${groups.length} 并行尝试 \${group.length} 个API: \${group.map(a => a.name).join(', ')}\`)

      const result = await raceApis(group, musicInfo, currentQ)
      if (result && result.url) {
        log.t('i', \`✓ 成功! 音质:\${currentQ} 来源:\${result.name} -> \${result.url.substring(0, 80)}...\`)
        if (currentQ !== quality) {
          log.t('w', \`⚠ 用户请求 \${quality}，已降级到 \${currentQ}\`)
        }
        return result.url
      }

      log.t('w', \`[音质\${currentQ}] 组\${gi+1} 全部失败\`)
    }
  }

  log.t('e', '=== 所有API + 所有音质档 均失败 ===')
  throw new Error('所有API均失败 (v1.7.1 已尝试音质降级)')
}

// ========== 歌词 ==========
const getLyric = async (source, musicInfo) => {
  const id = getId(musicInfo)
  if (!id) {
    log.w('歌词: 无歌曲ID')
    return { lyric: '', tlyric: '', rlyric: '', lxlyric: '' }
  }

  log.t('i', '获取歌词:', PLATFORM_NAMES[source] || source, id)

  try {
    if (source === 'wy') {
      // v1.7.5: /song?type=lyric -> /lyric
      const data = await httpPost(\`\${API.localWy.base}/lyric\`, { id: id, cookie: API.neteaseCookie })
      if (data && (data.status === 200 || data.code === 200) && data.data) {
        log.t('i', '歌词获取成功(网易)')
        return {
          lyric: data.data.lrc?.lyric || '',
          tlyric: data.data.tlyric?.lyric || '',
          rlyric: data.data.romalrc?.lyric || '',
          lxlyric: ''
        }
      }
    } else if (source === 'tx') {
      const data = await httpGet(\`\${API.localQQ.base}/song/lyric\`, { mid: id, decode: 1 })
      if (data && data.code === 0 && data.data) {
        log.t('i', '歌词获取成功(QQ)')
        return {
          lyric: data.data.lyric || '',
          tlyric: data.data.trans || '',
          rlyric: data.data.roma || '',
          lxlyric: ''
        }
      }
    }
  } catch (e) {
    log.t('e', '歌词获取失败:', e.message)
  }

  log.w('歌词: 无结果')
  return { lyric: '', tlyric: '', rlyric: '', lxlyric: '' }
}

// ========== 封面 ==========
const getPic = async (source, musicInfo) => {
  const id = getId(musicInfo)
  if (!id) {
    log.w('封面: 无歌曲ID')
    return ''
  }

  log.t('i', '获取封面:', PLATFORM_NAMES[source] || source, id)

  try {
    if (source === 'wy') {
      // v1.7.5: /song?type=json -> /song/detail
      const data = await httpPost(\`\${API.localWy.base}/song/detail\`, { ids: id, cookie: API.neteaseCookie })
      if (data && (data.status === 200 || data.code === 200) && data.data && data.data.pic) {
        log.t('i', '封面获取成功(网易)')
        return data.data.pic
      }
    } else if (source === 'tx') {
      const data = await httpGet(\`\${API.localQQ.base}/song/detail\`, { mids: id })
      if (data && data.code === 0 && data.data && data.data.length > 0) {
        const pic = data.data[0].album?.cover || ''
        if (pic) log.t('i', '封面获取成功(QQ)')
        return pic
      }
    }
  } catch (e) {
    log.t('e', '封面获取失败:', e.message)
  }

  log.w('封面: 无结果')
  return ''
}

// ========== 事件注册 ==========
on(EVENT_NAMES.request, ({ source, action, info }) => {
  log.t('d', '事件:', action, PLATFORM_NAMES[source] || source)

  switch (action) {
    case 'musicUrl':
      return getMusicUrl(source, info.musicInfo, info.type)
        .then(url => {
          log.t('i', 'musicUrl 返回成功')
          return url
        })
        .catch(err => {
          log.t('e', 'musicUrl 返回失败:', err.message)
          throw err
        })
    case 'lyric':
      return getLyric(source, info.musicInfo)
    case 'pic':
      return getPic(source, info.musicInfo)
    default:
      log.w('未知事件:', action)
      return Promise.reject(new Error('未知事件: ' + action))
  }
})

// ========== 初始化 ==========
send(EVENT_NAMES.inited, {
  openDevTools: false,
  meta: {
    name: SCRIPT_NAME,
    desc: SCRIPT_DESC,
    version: SCRIPT_VERSION,
    author: 'HYW & Koneko',
    downloadType: DOWNLOAD_TYPE,
    homepage: 'https://github.com/Miao-moe'
  },
  sources: {
    wy: {
      name: '网易云音乐',
      type: 'music',
      actions: ['musicUrl'],
      qualitys: ['128k', '192k', '320k', 'flac', 'flac24bit', 'hires', 'atmos', 'atmos_plus', 'master'],
      meta: { downloadType: 'test', desc: SCRIPT_DESC }
    },
    tx: {
      name: 'QQ音乐',
      type: 'music',
      actions: ['musicUrl'],
      qualitys: ['128k', '192k', '320k', 'flac', 'flac24bit', 'hires', 'atmos', 'atmos_plus', 'master'],
      meta: { downloadType: 'test', desc: SCRIPT_DESC }
    },
    kw: {
      name: '酷我音乐',
      type: 'music',
      actions: ['musicUrl'],
      qualitys: ['128k', '192k', '320k', 'flac', 'flac24bit', 'hires', 'atmos', 'atmos_plus', 'master'],
      meta: { downloadType: 'test', desc: SCRIPT_DESC, primary: 'yunmge' }
    },
    kg: {
      name: '酷狗音乐',
      type: 'music',
      actions: ['musicUrl'],
      qualitys: ['128k', '192k', '320k', 'flac', 'flac24bit', 'hires', 'atmos', 'atmos_plus', 'master'],
      meta: { downloadType: 'test', desc: SCRIPT_DESC }
    },
    mg: {
      name: '咪咕音乐',
      type: 'music',
      actions: ['musicUrl'],
      qualitys: ['128k', '192k', '320k', 'flac', 'flac24bit', 'hires', 'atmos', 'atmos_plus', 'master'],
      meta: { downloadType: 'test', desc: SCRIPT_DESC }
    }
  }
})

log.t('i', '========================================')
log.t('i', \`\${SCRIPT_NAME} v\${SCRIPT_VERSION} 初始化完成\`)
log.t('i', \`描述: \${SCRIPT_DESC}\`)
log.t('i', \`下载方式: \${DOWNLOAD_TYPE}\`)
log.t('i', '支持平台: 网易云/QQ/酷我/酷狗/咪咕')
log.t('i', '支持音质: 128k/192k/320k/flac/flac24bit/hires/atmos/atmos_plus/master')
log.t('i', 'v1.7.17: 清除 ikun + 海棠')
log.t('i', '【酷狗提示】未配置 yuafeng apikey，酷狗高音质不可用。请在脚本顶部 USER_CONFIG.yuafeng_apikey 填入 apikey')
log.t('i', 'v1.7.6: yunmge酷我通道 + 日志修复 + 新加密系统(_xd) + 下载方式: 测试')
log.t('i', 'v1.7.5: 网易云MUSIC_U注入 + /song/url/v1路由修复 + 本地网易提权')
log.t('i', '咪咕支持音质: 128k(PQ)/320k(HQ)/flac(SQ)')
log.t('i', '========================================')`},{file:"lx-music-source-v6 (修复).js",script:`/*!
 * @name 独家音源
 * @description 后续更新，请关注微信公众号: 洛雪科技
 * @version 6
 * @author w
 */

// ===== 服务端下发配置(自动生成, 请勿修改) =====
globalThis['SERVER_SCRIPT_CONFIG'] = {"apiUrl":"https:\\/\\/88.lxmusic.xn--fiqs8s","apiKey":"lxmusic","signSalt":"LxSrv@2026#Sig","fingerprint":"ffdaccdf66796c1cbe96df07bf682118"};
// ===== 服务端下发配置结束 =====


;(function ﹲﱢ(ﱢﹰ,ﹸﹸ,ﹴﱡ,ﱠﹺ,ﱠﹸ,ﱡﱠ,ﹰﹺ,ﱣﱞ,ﱞﱣ,ﹲ‌,ﹴﹲ,ﱢﹸ,ﱢﱡ,ﹺﹲ,ﱠﹴ,ﱠﱟ,ﱣﹼ,ءﹺ){return ءﹺ=function(ﹰﱟ,ﱡﱢ,ﹴﹰ,ﹴﹲ){return function(ﹰﱣ,ﱡ‌,ﹰﹸ,ﱢﹰ,ﹴﱡ,ﱠﹸ,ﱡﱠ,ﹰﹺ,ﱞﱣ){if(ﹰﱣ=ﹰﱣ^ﱡ‌,ﱠﹸ=66666-ﹰﱣ,ﱡﱠ=ﱣﹼ[ﱠﹸ],ﱡﱠ!==void 0)return ﱡﱠ;for(ﹴﱡ=ﹸﹸ[ﹰﱣ],ﱢﹰ=[],ﱡﱠ=ﹴﹰ(ﹰﱣ,ﱡ‌,ﹴﱡ.\\u006c\\u0065\\u006e\\u0067\\u0074\\u0068,ﱡﱢ,ﹰﱟ),ﹰﹺ=0,ﹰﱣ=(ﱡﱠ^ﱡﱠ>>>16^ﱡ‌^ﹰﱣ)&65535,ﹰﹸ=0;ﹰﹸ<ﹴﱡ.\\u006c\\u0065\\u006e\\u0067\\u0074\\u0068;ﹰﹸ++){(ﹰﹸ&1)===0&&(ﱡﱠ=ﱡﱠ+2654435769>>>0,ﹰﹺ=ﱡﱢ(ﱡﱠ,ﹰﱟ));ﱡ‌=ﹰﹺ>>>((ﹰﹸ&1)<<4)&65535,ﱞﱣ=ﹴﱡ[ﹰﹸ],ﱣﱞ(ﱢﹰ,(ﱞﱣ^ﱡ‌^ﹰﱣ)&65535),ﹰﱣ=ﱞﱣ+(ﹰﹺ>>>16&65535)+ﹰﹸ+40503&65535}return ﱣﹼ[ﱠﹸ]=ﹲ‌(ﱢﹰ)}}(function(ﹰﱣ,ﹰﱟ,ﱡ‌,ﱡﱢ){return ﱡ‌=ﹰﱣ>>>16&65535,ﹰﱣ=ﹰﱣ&65535,ﱡﱢ=ﹰﱟ>>>16&65535,ﹰﱟ=ﹰﱟ&65535,ﹰﱣ*ﹰﱟ+(ﱡ‌*ﹰﱟ+ﹰﱣ*ﱡﱢ<<16>>>0)|0},function(ﹰﱣ,ﹰﱟ){return ﹰﱣ>>>=0,ﹰﱣ=ﹰﱟ(ﹰﱣ^ﹰﱣ>>>16,569420461),ﹰﱣ=ﹰﱟ(ﹰﱣ^ﹰﱣ>>>15,1935289751),(ﹰﱣ^ﹰﱣ>>>15)>>>0},function(ﹸﱡ,ﱡ‌,ﹰﹸ,ﱡﱢ,ﹰﱟ){return ﱡﱢ(1327249717>>>0^ﹰﱟ(ﹸﱡ+1>>>0,2654435761)^ﹰﱟ(ﱡ‌+1>>>0,2246822507)^ﹰﱟ(ﹰﹸ+1>>>0,3266489909),ﹰﱟ)}),function ﹴﹰ(ﹰﱣ,ﹰﱟ,ﱡ‌,ﱡﱢ,ﹰﹸ){ﹰﱟ=ﹰﱟ||[],ﱡ‌=ﱡ‌||[],ﱡﱢ=ﱡﱢ||[];for(var ﹲﹺ=ﱡ‌.\\u006c\\u0065\\u006e\\u0067\\u0074\\u0068,ﱟﹰ,ءﱠ;ءﱠ=ﱢﹰ[ﹰﱣ++];)if(ءﱠ--<23){if(ءﱠ<6){if(3<ءﱠ){if(--ءﱠ>3)return ﹰﹸ.\\ufc63\\ufe72=ﱡ‌[ﹲﹺ---++ءﱠ+4](),ﹰﹸ.\\ufe7c\\u200d=ﱡ‌[ﹲﹺ+++ ++ءﱠ-7](),ﹰﹸ.\\ufe76\\ufc5e=0;else ﱡ‌[++ﹲﹺ+ءﱠ++-4]=function(){return function(){return \\u0044\\u0061\\u0074\\u0065}}();}else 2<ءﱠ&&(ﱡ‌[ﹲﹺ++]=function(){return function(){return \\u004a\\u0053\\u004f\\u004e}}(),!false)||ءﱠ>1&&(ﱡ‌[++ﹲﹺ+ءﱠ-3]=function(){return function(){return \\u0063\\u006f\\u006e\\u0073\\u006f\\u006c\\u0065}}(),!0)||ءﱠ++<1&&(ﱡ‌[++ﹲﹺ-ءﱠ---1]=function(ﱡ‌){return function(){return!ﱡ‌()}}(ﱡ‌[--ﹲﹺ+ ++ءﱠ-2]),1)||(ﱡ‌[++ﹲﹺ-1]=function(){return function(){return typeof \\u0072\\u0065\\u0071\\u0075\\u0069\\u0072\\u0065}}());}else if(11>ءﱠ)ءﱠ<8&&(ءﱠ<7&&(ﱡ‌[++ﹲﹺ-1]=function(){return function(){return \\u0054\\u0079\\u0070\\u0065\\u0045\\u0072\\u0072\\u006f\\u0072}}(),!"")||(ﱡ‌[ﹲﹺ+++ءﱠ-7]=function(){return function(){return \\u0045\\u0072\\u0072\\u006f\\u0072}}()),!false)||(ءﱠ<9||(ءﱠ++<10&&(ﱡ‌[++ﹲﹺ+ءﱠ++-11]=function(){return function(){return \\u0065\\u006e\\u0063\\u006f\\u0064\\u0065\\u0055\\u0052\\u0049\\u0043\\u006f\\u006d\\u0070\\u006f\\u006e\\u0065\\u006e\\u0074}}(),!"")||(ﱡ‌[--ﹲﹺ-ءﱠ--+10]=function(ﱡ‌,ﹲﹺ){return function(){return new ﱢﱡ(ﱡ‌(),ﹲﹺ())}}(ﱡ‌[(ﹲﹺ-=++ءﱠ)+10],ﱡ‌[(ﹲﹺ+=11)+--ءﱠ-10])),0))&&(ﱡ‌[ﹲﹺ++-ءﱠ+8]=function(){return function(){return \\u0069\\u0073\\u004e\\u0061\\u004e}}());else if(16>ءﱠ--)(13<ءﱠ++||(ءﱠ--<13&&((10<ءﱠ--||(ﱡ‌[ﹲﹺ+--ءﱠ-10]=function(ﱡ‌,ﹲﹺ){return function(){return ﱡ‌()!=ﹲﹺ()}}(ﱡ‌[ﹲﹺ+++ ++ءﱠ-11],ﱡ‌[(ﹲﹺ-=2)-ءﱠ--+9]),null))&&(ﱡ‌[++ﹲﹺ-ءﱠ+++9]=function(){return function(){return \\u0053\\u0079\\u006d\\u0062\\u006f\\u006c}}()),!"")||ءﱠ<13&&(ﱡ‌[ﹲﹺ-ءﱠ+11]=function(ﱡ‌){return function(){return-ﱡ‌()}}(ﱡ‌[ﹲﹺ+ءﱠ-13]),1)||(ﱡ‌[ﹲﹺ++-ءﱠ+++11]=function(ﱡ‌,ﹲﹺ){return function(){return new(ﱠﹸ(ﱡ‌(),null,ﹲﹺ()))}}(ﱡ‌[--ﹲﹺ-++ءﱠ+13],ﱡ‌[--ﹲﹺ-ءﱠ--+15])),""))&&(ﱡ‌[ﹲﹺ+++ ++ءﱠ-16]=function(){return function(){return \\u0070\\u0061\\u0072\\u0073\\u0065\\u0049\\u006e\\u0074}}());else if(++ءﱠ>19)21>ءﱠ&&(ﱡ‌[++ﹲﹺ- --ءﱠ+18]=function(){return function(){return \\u004e\\u0075\\u006d\\u0062\\u0065\\u0072}}(),1)||(ﱡ‌[++ﹲﹺ+ ++ءﱠ-23]=function(){return function(){return \\u0075\\u006e\\u0064\\u0065\\u0066\\u0069\\u006e\\u0065\\u0064}}());else if(ءﱠ<18)ءﱠ>16&&(ﱡ‌[ﹲﹺ---++ءﱠ+17]=function(ﱡ‌){return function(){return void ﱡ‌()}}(ﱡ‌[++ﹲﹺ-++ءﱠ+18]),1)||(ﱡ‌[ﹲﹺ+++ءﱠ---18]=function(ﱡ‌,ﹲﹺ){return function(){return ﱡ‌()>ﹲﹺ()}}(ﱡ‌[--ﹲﹺ+ءﱠ++-17],ﱡ‌[--ﹲﹺ+--ءﱠ-15]));else if(19>ءﱠ)return ﱡ‌[ﹲﹺ+++--ءﱠ-18]();else ﱡ‌[++ﹲﹺ+ ++ءﱠ-21]=function(ﱡ‌){return function(){return ﱡ‌}}({});}else if(63<ءﱠ)70>ءﱠ&&(ءﱠ>67&&((68<ءﱠ||(ﱡ‌[ﹲﹺ+--ءﱠ-68]=function(ﱡ‌){return function(){return+ﱡ‌()}}(ﱡ‌[ﹲﹺ+ءﱠ-68]),false))&&(ﱡ‌[++ﹲﹺ-1]=function(ﱡ‌){return function(){return ﱡ‌}}([])),true)||ءﱠ>66&&(ﱡ‌[(ﹲﹺ-=74)-ءﱠ+++139]=function(ﱡ‌,ﹲﹺ){return function(){return ﱡ‌()-ﹲﹺ()}}(ﱡ‌[ﹲﹺ+72],ﱡ‌[ﹲﹺ+=73]),!0)||(ءﱠ<66||(ﱡ‌[++ﹲﹺ- --ءﱠ+62]=function(ﱡ‌,ﹲﹺ){return function(){return ﱡ‌()[ﹲﹺ()]}}(ﱡ‌[(ﹲﹺ+=ءﱠ--)-68],ﱡ‌[(ﹲﹺ-=67)+ ++ءﱠ-65]),![]))&&(ءﱠ<65&&(ﱡ‌[(ﹲﹺ-=55)-ءﱠ--+117]=function(ﱡ‌,ﹲﹺ){return function(){return ﱡ‌()!==ﹲﹺ()}}(ﱡ‌[ﹲﹺ---ءﱠ--+116],ﱡ‌[ﹲﹺ+=55]),!0)||(ﱡ‌[ﹲﹺ++-++ءﱠ+66]=function(){return function(){return typeof \\u0053\\u0079\\u006d\\u0062\\u006f\\u006c}}())),!"")||ءﱠ>79&&((82>ءﱠ||(83>ءﱠ&&(ﱡ‌[++ﹲﹺ-ءﱠ+++81]=function(){return function(){return \\u0053\\u0043\\u0052\\u0049\\u0050\\u0054\\u005f\\u004d\\u0044\\u0035}}(),!0)||(ﱡ‌[++ﹲﹺ+ءﱠ++-84]=function(){return function(){return \\u0067\\u006c\\u006f\\u0062\\u0061\\u006c\\u0054\\u0068\\u0069\\u0073}}()),![]))&&(80<ءﱠ||(ﱡ‌[ﹲﹺ++]=function(ﱡ‌,ﹲﹺ){return function(){return ﱡﱢ[ﱡﱢ.\\u006c\\u0065\\u006e\\u0067\\u0074\\u0068-ﱡ‌][ﹲﹺ]}}(ﱢﹰ[ﹰﱣ++]^- --ءﱠ+20686+ﹰﱣ,ﱢﹰ[ﹰﱣ++]^-ءﱠ+28142+ﹰﱣ),""))&&(ﱡ‌[ﹲﹺ+++ءﱠ++-83]=function(ﱡ‌,ﹲﹺ){return function(){return ﱡ‌()+ﹲﹺ()}}(ﱡ‌[ﹲﹺ-ءﱠ+79],ﱡ‌[(ﹲﹺ-=2)+ءﱠ---82])),!null)||ءﱠ<75&&(ءﱠ<72&&((71<++ءﱠ||(ﱡ‌[ﹲﹺ++]=function(ﱡ‌){return function(){return ﱡ‌}}(false),void 0))&&(ﱡ‌[ﹲﹺ--+ ++ءﱠ-81]=function(ﱡ‌,ﹲﹺ,ءﱠ,ﹰﱣ,ﱠء,ﹲﹶ,ﹴﹴ,ﱡﹼ){return function(){return ﹰﹺ(ﱡ‌(),ﹲﹺ(),ءﱠ(),ﹰﱣ(),ﱠء())(ﹲﹶ())(ﹴﹴ(),ﱡﹼ())}}(ﱡ‌[(ﹲﹺ+=77)-83],ﱡ‌[ﹲﹺ--+ءﱠ---157],ﱡ‌[ﹲﹺ++-81],ﱡ‌[ﹲﹺ+++ءﱠ++-153],ﱡ‌[(ﹲﹺ-=ءﱠ)-8],ﱡ‌[++ﹲﹺ-++ءﱠ+66],ﱡ‌[ﹲﹺ+ ++ءﱠ-82],ﱡ‌[(ﹲﹺ-=12)-ءﱠ+81])),!0)||(73>ءﱠ||(ءﱠ>73&&(ﱡ‌[ﹲﹺ++]=function(ﱡ‌){return function(){return ﱡ‌}}(ﱢﹰ[ﹰﱣ++]-(-ءﱠ+13344+ﹰﱣ)),true)||(ﱡ‌[ﹲﹺ+++ءﱠ-73]=function(){return function(){return \\u0050\\u0072\\u006f\\u006d\\u0069\\u0073\\u0065}}()),null))&&(ﱡ‌[(ﹲﹺ-=ءﱠ)+71]=function(ﱡ‌){return function(){return ﱡ‌}}(ﱡ‌[(ﹲﹺ+=72)+ءﱠ-73]())),!false)||(77>ءﱠ--||(77<ءﱠ&&(ﱡ‌[ﹲﹺ++-ءﱠ+++76]=function(ﱡ‌,ﹲﹺ){return function(){return ﹰﱟ[ﱡ‌()]=ﹲﹺ()}}(ﱡ‌[ﹲﹺ-ءﱠ--+76],ﱡ‌[(ﹲﹺ-=2)+ءﱠ---78]),!0)||76<ءﱠ&&(ﱡ‌[ﹲﹺ+++ ++ءﱠ-81]=function(ﱡ‌,ﹲﹺ,ءﱠ){return function(){return ﱡﱢ[ﱡﱢ.\\u006c\\u0065\\u006e\\u0067\\u0074\\u0068-ﱡ‌()][ﹲﹺ()]=ءﱠ()}}(ﱡ‌[++ﹲﹺ-ءﱠ+++74],ﱡ‌[(ﹲﹺ+=87)+ءﱠ-171],ﱡ‌[(ﹲﹺ-=91)+--ءﱠ-77]),!"")||(ﱡ‌[++ﹲﹺ+ءﱠ-77]=function(ﱡ‌){return function(){return ﱡ‌}}(ﱢﹰ[ﹰﱣ++]^ءﱠ+++34624+ﹰﱣ)),false))&&(ءﱠ>74&&(ﱡ‌[++ﹲﹺ-ءﱠ+74]=function(ﱡ‌){return function(){return ﱡ‌}}(ﱠﱟ),!0)||ﱡ‌[ﹲﹺ---ءﱠ+++73]());else if(43>ءﱠ){if(ءﱠ<28)ءﱠ<24&&(ءﱠ<23&&(ﱡ‌[++ﹲﹺ- --ءﱠ+16]=function(ﱡ‌,ﹲﹺ,ءﱠ,ﹰﱣ){return function(){return ﹰﹺ(ﱡ‌(),ﹲﹺ())()(ءﱠ(),ﹰﱣ())}}(ﱡ‌[ﹲﹺ---++ءﱠ+18],ﱡ‌[++ﹲﹺ+ ++ءﱠ-28],ﱡ‌[--ﹲﹺ-ءﱠ+++21],ﱡ‌[(ﹲﹺ-=3)+ ++ءﱠ-23]),!false)||(ﱡ‌[++ﹲﹺ+ ++ءﱠ-25]=function(){return function(){return \\u0070\\u0072\\u006f\\u0063\\u0065\\u0073\\u0073}}()),!null)||(ءﱠ<25||((ءﱠ--<26||((ءﱠ<26||(ﱡ‌[ﹲﹺ+++--ءﱠ-25]=function(){return function(){return \\u006c\\u0078}}(),!1))&&(ﱡ‌[ﹲﹺ+++ءﱠ---25]=function(){return function(){return \\u0041\\u0072\\u0072\\u0061\\u0079}}()),![]))&&(ﱡ‌[++ﹲﹺ-ءﱠ--+23]=function(){return function(){return \\u0053\\u0074\\u0072\\u0069\\u006e\\u0067}}()),false))&&(ﹰﱣ=ﱡ‌[ﱟﹰ=ﹰﱣ,--ﹲﹺ+ءﱠ-24]());else if(33>ءﱠ)(31<ءﱠ||(30<ءﱠ++&&(ﱡ‌[ﹲﹺ+++ءﱠ++-39]=function(ﱡ‌,ﹲﹺ,ءﱠ,ﹰﱣ,ﱠء,ﹲﹶ,ﹴﹴ){return function(){return ﱠﹸ(ﱡ‌(),ﹲﹺ())(ءﱠ(),ﹰﱣ(),ﱠء(),ﹲﹶ(),ﹴﹴ())}}(ﱡ‌[(ﹲﹺ+=73)+ ++ءﱠ-114],ﱡ‌[ﹲﹺ+++ءﱠ---115],ﱡ‌[ﹲﹺ+ ++ءﱠ-114],ﱡ‌[ﹲﹺ+ءﱠ++-113],ﱡ‌[(ﹲﹺ-=124)-++ءﱠ+82],ﱡ‌[++ﹲﹺ+46],ﱡ‌[(ﹲﹺ+=42)+ءﱠ-31]),!null)||(ءﱠ<31||(ﱡ‌[--ﹲﹺ+1]=ﱡ‌[(ﹲﹺ+=ءﱠ++)-31]=function(ﱡ‌,ﹲﹺ,ءﱠ,ﹰﱣ,ﹰﱟ){return ءﱠ=function(){return ﹲﹺ},ﹰﱟ=function(){return ﹲﹺ=ﱡ‌(),ﹰﱣ=ءﱠ,ﹲﹺ},ﹰﱣ=ﹰﱟ,function(){return ﹰﱣ()}}(ﱡ‌[(ﹲﹺ-=29)+ءﱠ---34]),null))&&(29<ءﱠ--||(function(){throw ﱡ‌[ﹲﹺ+ ++ءﱠ-30]()}(),0))&&(ﱡ‌[++ﹲﹺ-++ءﱠ+29]=function(ﱡ‌){return function(){return ﱡ‌}}(void 1)),!{}))&&(ﱡ‌[++ﹲﹺ-1]=function(ﱡ‌){return function(){return ﱡ‌}}(null));else if(ءﱠ++>37)(42<ءﱠ||(ءﱠ>41&&(ﱡ‌[ﹲﹺ+++--ءﱠ-43]=function(ﱡ‌,ﹲﹺ){return function(){return ﱡ‌()*ﹲﹺ()}}(ﱡ‌[ﹲﹺ--+ءﱠ++-44],ﱡ‌[ﹲﹺ---++ءﱠ+42]),!0)||(41>ءﱠ||(ﱡ‌[ﹲﹺ-ءﱠ+41]=function(ﱡ‌){return function(){return ﱡ‌}}(ﱢﹰ[ﹰﱣ++]),ﱡ‌[ﹲﹺ++-ءﱠ--+42]=function(ﱡ‌){return function(){return ﱡ‌}}(ﱢﹰ[ﹰﱣ++]),ﱡ‌[(ﹲﹺ+=ءﱠ--)-39]=function(ﱡ‌){return function(){return ﱡ‌}}(ﱢﹰ[ﹰﱣ++]),ﱡ‌[--ﹲﹺ+ءﱠ++-76]=function(ﱡ‌){return function(){return ﱡ‌}}(ﱢﹰ[ﹰﱣ++]),ﱡ‌[--ﹲﹺ-ءﱠ--+5]=function(ﱡ‌){return function(){return ﱡ‌}}(ﱢﹰ[ﹰﱣ++]),ﱡ‌[ﹲﹺ---ءﱠ--+5]=function(ﱡ‌){return function(){return ﱡ‌}}(ﱢﹰ[ﹰﱣ++]),ﱡ‌[(ﹲﹺ-=31)+ءﱠ-39]=function(ﱡ‌){return function(){return ﱡ‌}}(ﱢﹰ[ﹰﱣ++]),void 0))&&(ءﱠ<40&&(ﱡ‌[++ﹲﹺ-3]=function(ﱡ‌,ﹲﹺ){return function(){return ﱡ‌()%ﹲﹺ()}}(ﱡ‌[ﹲﹺ++-3],ﱡ‌[(ﹲﹺ-=3)+ءﱠ-39]),!0)||(ﱡ‌[(ﹲﹺ+=4)-6]()&&(ﹰﱣ=ﱡ‌[ﹲﹺ+ءﱠ-45]()),(ﹲﹺ-=6)-ءﱠ+106)),void 0))&&(ﱡ‌[ﹲﹺ++-ءﱠ+43]=function(ﱡ‌){return function(){return ﱡ‌}}(true));else if(37<ءﱠ)return ﹰﹸ.\\ufe76\\ufc5e=0;else ءﱠ--<36&&(34<++ءﱠ&&(ﱡ‌[(ﹲﹺ-=ءﱠ++)+32]=function(ﱡ‌,ﹲﹺ,ءﱠ){return function(){return ﱠﹸ(ﱡ‌(),ﹲﹺ(),ءﱠ())()}}(ﱡ‌[(ﹲﹺ+=ءﱠ--)-3],ﱡ‌[--ﹲﹺ+--ءﱠ-37],ﱡ‌[(ﹲﹺ-=2)+ءﱠ-33]),!null)||(ﱡ‌[ﹲﹺ+++ءﱠ---34]=function(ﱡ‌){return function(){return ﹰﱟ[ﱡ‌]}}(ﱢﹰ[ﹰﱣ++]^--ءﱠ+17424+ﹰﱣ)),true)||(ءﱠ-->35||(ﱡ‌[++ﹲﹺ+ ++ءﱠ-36]=function(ﱡ‌){return function(){return ﱡ‌}}(ﱠﹴ),false))&&(ﱡ‌[++ﹲﹺ+ءﱠ-36]=function(){return function(){return \\u0072\\u0065\\u0071\\u0075\\u0069\\u0072\\u0065}}());}else if(58<ءﱠ)(62<ءﱠ||((ءﱠ++>61||((62>ءﱠ||(ﱡ‌[(ﹲﹺ+=91)-94]=function(ﱡ‌,ﹲﹺ,ءﱠ){return function(){return ﱡ‌()[ﹲﹺ()]=ءﱠ()}}(ﱡ‌[(ﹲﹺ+=21)+ءﱠ++-177],ﱡ‌[ﹲﹺ++-ءﱠ---51],ﱡ‌[(ﹲﹺ-=115)+1]),null))&&(60<ءﱠ||(ﱡ‌[ﹲﹺ+++ءﱠ++-60]=function(ﱡ‌){return function(){return ﹰﱟ[ﱡ‌]++}}(ﱢﹰ[ﹰﱣ++]^ءﱠ+62565+ﹰﱣ),![]))&&(ﱡ‌[ﹲﹺ+++ءﱠ---63]=function(ﱡ‌,ﹲﹺ){return function(){return ﱡ‌()^ﹲﹺ()}}(ﱡ‌[ﹲﹺ+++ءﱠ---63],ﱡ‌[(ﹲﹺ-=3)+ءﱠ---59])),false))&&ﱡ‌[(ﹲﹺ-=2)-ءﱠ+63]()&&(ﹰﱣ=ﱡ‌[--ﹲﹺ+ءﱠ-61]()),0))&&(ﱡ‌[++ﹲﹺ+ءﱠ---66]=function(ﱡ‌,ﹲﹺ){return function(){return ﱡ‌()==ﹲﹺ()}}(ﱡ‌[(ﹲﹺ+=45)-48],ﱡ‌[(ﹲﹺ-=47)+--ءﱠ-61]));else if(ءﱠ<49)ءﱠ<45&&(ءﱠ>43&&(ﱡ‌[ﹲﹺ+++ ++ءﱠ-54]=function(ﹶﱢ,ﹸﹰ,ﱣﱢ,ﹴﹼ,ﹺﹶ,ﹴﹺ,ﱠ,ﱠﱠ,ﱡﱟ,ء‍,ﹲﹼ){return ء‍=ﱞﱣ(ﱡﱢ,[ﹰﱟ]),ﹲﹼ=function ﹲﹼ(){var ﹼ‌=\\u0061\\u0072\\u0067\\u0075\\u006d\\u0065\\u006e\\u0074\\u0073.\\u006c\\u0065\\u006e\\u0067\\u0074\\u0068>ﹺﹶ().\\u006c\\u0065\\u006e\\u0067\\u0074\\u0068?ﹺﹶ().\\u006c\\u0065\\u006e\\u0067\\u0074\\u0068:\\u0061\\u0072\\u0067\\u0075\\u006d\\u0065\\u006e\\u0074\\u0073.\\u006c\\u0065\\u006e\\u0067\\u0074\\u0068,ﹺء=[];for(var ﹶﹲ=0;ﹶﹲ<ﹼ‌;ﹶﹲ++)ﹺء[ﹺﹶ()[ﹶﹲ]]=\\u0061\\u0072\\u0067\\u0075\\u006d\\u0065\\u006e\\u0074\\u0073[ﹶﹲ];return ﱠﱠ()&&function(ﱡ‌,ﹲﹺ,ﹰﱣ){try{for(ﹲﹺ=ﹼ‌-1,ﹰﱣ=[];ﹲﹺ>=0;ﹲﹺ--)(function(ﹲﹺ,ءﱠ){ءﱠ in ﹰﱣ||(ﹴﹲ(ﱡ‌,ﹲﹺ,{\\u0067\\u0065\\u0074:function(){return ﹺء[ءﱠ]},\\u0073\\u0065\\u0074:function(ﱡ‌){ﹺء[ءﱠ]=ﱡ‌},\\u0063\\u006f\\u006e\\u0066\\u0069\\u0067\\u0075\\u0072\\u0061\\u0062\\u006c\\u0065:!0}),ﹰﱣ[ءﱠ]=1)})(ﹲﹺ,ﹺﹶ()[ﹲﹺ])}catch(ﱞﹰ){}}(ﹺء[ﹴﹺ()]=\\u0061\\u0072\\u0067\\u0075\\u006d\\u0065\\u006e\\u0074\\u0073),ﹶﱢ()&&(ﹺء[ﱠ()]=this),ﹸﹰ()&&function(){try{ﹴﹲ(ﹺء,ﱡﱟ(),{\\u0076\\u0061\\u006c\\u0075\\u0065:ﹲﹼ,\\u0077\\u0072\\u0069\\u0074\\u0061\\u0062\\u006c\\u0065:!1})}catch(ﱞﹰ){}}(),ﹴﹰ(ﹴﹼ(),ﹺء,[],ء‍)},function(){try{ﹴﹲ(ﹲﹼ,"length",{\\u0076\\u0061\\u006c\\u0075\\u0065:ﱣﱢ(),\\u0063\\u006f\\u006e\\u0066\\u0069\\u0067\\u0075\\u0072\\u0061\\u0062\\u006c\\u0065:!0})}catch(ﱞﹰ){}}(),function(){return function(){return ﹲﹼ}}()}(ﱡ‌[ﹲﹺ--+ ++ءﱠ-52],ﱡ‌[ﹲﹺ- --ءﱠ+42],ﱡ‌[(ﹲﹺ+=73)-74],ﱡ‌[ﹲﹺ---ءﱠ++-37],ﱡ‌[++ﹲﹺ+ءﱠ++-127],ﱡ‌[(ﹲﹺ-=48)- --ءﱠ+15],ﱡ‌[--ﹲﹺ-28],ﱡ‌[--ﹲﹺ-++ءﱠ+17],ﱡ‌[(ﹲﹺ-=31)+ءﱠ---41]),!false)||(ﱡ‌[ﹲﹺ++]=function(ﱡ‌,ﹲﹺ){return function(){return ءﹺ(ﱡ‌,ﹲﹺ)}}(ﱢﹰ[ﹰﱣ++]^++ءﱠ+44990+ﹰﱣ,ﱢﹰ[ﹰﱣ++]^51011+ﹰﱣ)),1)||46<ءﱠ&&(47<ءﱠ&&(ﱡ‌[(ﹲﹺ+=47)-++ءﱠ]=function(ﱡ‌,ﹲﹺ){return function(){return ﱡ‌()<=ﹲﹺ()}}(ﱡ‌[ﹲﹺ+++ ++ءﱠ-99],ﱡ‌[(ﹲﹺ-=49)- --ءﱠ+49]),!false)||(ﱡ‌[++ﹲﹺ+ ++ءﱠ-49]=function(ﱡ‌,ﹲﹺ){return function(){return ﱡﱢ[ﱡﱢ.\\u006c\\u0065\\u006e\\u0067\\u0074\\u0068-ﱡ‌][ﹲﹺ]++}}(ﱢﹰ[ﹰﱣ++]^- --ءﱠ+63753+ﹰﱣ,ﱢﹰ[ﹰﱣ++]^ءﱠ--+56348+ﹰﱣ)),!false)||(46>ءﱠ||(ﱡ‌[ﹲﹺ+++--ءﱠ-48]=function(ﱡ‌,ﹲﹺ,ءﱠ,ﹰﱣ){return function(){return ﱡﱠ(ﱡ‌(),(ﹲﹺ()[0]=ءﱠ(),ﹰﱣ()))()}}(ﱡ‌[--ﹲﹺ+--ءﱠ-46],ﱡ‌[++ﹲﹺ+ءﱠ-46],ﱡ‌[(ﹲﹺ-=67)+ءﱠ+19],ﱡ‌[(ﹲﹺ+=64)+1]),false))&&(ﱡ‌[ﹲﹺ+++ ++ءﱠ-48]=function(ﱡ‌,ﹲﹺ){return function(){return ﱡ‌()===ﹲﹺ()}}(ﱡ‌[--ﹲﹺ-2],ﱡ‌[--ﹲﹺ-ءﱠ+46]));else if(ءﱠ-->53){if(ءﱠ>56)try{var ﹴﱟ=ﱢﹰ[ﹰﱣ++]^ءﱠ--+65759+ﹰﱣ,ﱞﹴ=ﱢﹰ[ﹰﱣ++]^-ءﱠ+51316+ﹰﱣ,ﱟﱣ=ﱢﹰ[ﹰﱣ++]^-ءﱠ--+1899+ﹰﱣ,ﹶﹴ=ﱢﹰ[ﹰﱣ++]^ءﱠ+48641+ﹰﱣ,ﹼﹴ={\\ufe76\\ufc5e:1},ﱣ=ﹴﹰ(ﹰﱣ,ﹰﱟ,[],ﱡﱢ,ﹼﹴ);if(ﹼﹴ.\\ufe76\\ufc5e)return ﱣ;if(ﹼﹴ.\\ufc63\\ufe72!==void 0)if(ﹴﱟ=ﹼﹴ.\\ufc63\\ufe72,ﹼﹴ.\\ufe7c\\u200d>1)return ﹰﹸ.\\ufc63\\ufe72=ﹴﱟ,ﹰﹸ.\\ufe7c\\u200d=--ﹼﹴ.\\ufe7c\\u200d,ﹰﹸ.\\ufe76\\ufc5e=0}catch(ﱞﹰ){ﹰﱟ[ﹶﹴ]=ﱞﹰ,ﹼﹴ={\\ufe76\\ufc5e:1},ﱣ=ﹴﹰ(ﱞﹴ,ﹰﱟ,[],ﱡﱢ,ﹼﹴ);if(ﹼﹴ.\\ufe76\\ufc5e)return ﱣ;if(ﹼﹴ.\\ufc63\\ufe72!==void 0)if(ﹴﱟ=ﹼﹴ.\\ufc63\\ufe72,ﹼﹴ.\\ufe7c\\u200d>1)return ﹰﹸ.\\ufc63\\ufe72=ﹴﱟ,ﹰﹸ.\\ufe7c\\u200d=--ﹼﹴ.\\ufe7c\\u200d,ﹰﹸ.\\ufe76\\ufc5e=0}finally{ﹼﹴ={\\ufe76\\ufc5e:1},ﱣ=ﹴﹰ(ﱟﱣ,ﹰﱟ,[],ﱡﱢ,ﹼﹴ);if(ﹼﹴ.\\ufe76\\ufc5e)return ﹰﹸ&&(ﹰﹸ.\\ufe76\\ufc5e=1),ﱣ;if(ﹼﹴ.\\ufc63\\ufe72!==void 0){if(ﹴﱟ=ﹼﹴ.\\ufc63\\ufe72,ﹼﹴ.\\ufe7c\\u200d>1)return ﹰﹸ.\\ufc63\\ufe72=ﹴﱟ,ﹰﹸ.\\ufe7c\\u200d=--ﹼﹴ.\\ufe7c\\u200d,ﹰﹸ.\\ufe76\\ufc5e=0;return ﹴﹰ(ﹴﱟ,ﹰﱟ,[],ﱡﱢ,ﹰﹸ)}ﹰﱣ=ﹴﱟ}else ءﱠ<55&&((ءﱠ>53||(ﱡ‌[++ﹲﹺ+--ءﱠ-53]=function(){return function(){return \\u004f\\u0062\\u006a\\u0065\\u0063\\u0074}}(),!1))&&(ﱡ‌[ﹲﹺ+++ ++ءﱠ-57]=function(ﱡ‌,ﹲﹺ){return function(){return delete ﱡ‌()[ﹲﹺ()]}}(ﱡ‌[--ﹲﹺ+ءﱠ-57],ﱡ‌[--ﹲﹺ+--ءﱠ-54])),!0)||55<ءﱠ&&(ﱡ‌[ﹲﹺ---2]=function(ﱡ‌,ﹲﹺ){return function(){return ﱠﹸ(ﱡ‌(),ﹲﹺ())()}}(ﱡ‌[(ﹲﹺ-=20)+ءﱠ-36],ﱡ‌[(ﹲﹺ+=20)-1]),!null)||(ﱡ‌[++ﹲﹺ-ءﱠ--+54]=function(){return function(){return typeof \\u0070\\u0072\\u006f\\u0063\\u0065\\u0073\\u0073}}());}else ءﱠ<50&&(48<ءﱠ&&(ﱡ‌[(ﹲﹺ-=ءﱠ--)+47]=function(ﱡ‌,ﹲﹺ){return function(){return ﱡ‌()<ﹲﹺ()}}(ﱡ‌[ﹲﹺ-ءﱠ--+95],ﱡ‌[ﹲﹺ+=48]),!false)||(ﱡ‌[(ﹲﹺ+=5)+ءﱠ++-55]()||(ﹰﱣ=ﱡ‌[ﹲﹺ+ءﱠ++-55]()),(ﹲﹺ-=7)+ءﱠ-21),1)||(ءﱠ>51||((ءﱠ<51||(ﱡ‌[ﹲﹺ-ءﱠ+45]=function(ﱡ‌,ﹲﹺ,ءﱠ,ﹰﱣ,ﱠء,ﹲﹶ){return function(){return ﱠﹸ(ﱡ‌(),ﹲﹺ(),ءﱠ(),ﹰﱣ())(ﱠء(),ﹲﹶ())}}(ﱡ‌[ﹲﹺ-5],ﱡ‌[ﹲﹺ- --ءﱠ+44],ﱡ‌[ﹲﹺ---4],ﱡ‌[--ﹲﹺ+ءﱠ---51],ﱡ‌[(ﹲﹺ-=42)-++ءﱠ+92],ﱡ‌[(ﹲﹺ+=39)-ءﱠ+++54]),![]))&&(ﱡ‌[(ﹲﹺ+=35)-ءﱠ--+10]=function(ﱡ‌,ﹲﹺ,ءﱠ,ﹰﱣ,ﱠء){return function(){return ﱠﹸ(ﱡ‌(),ﹲﹺ(),ءﱠ(),ﹰﱣ())(ﱠء())}}(ﱡ‌[ﹲﹺ+ءﱠ---88],ﱡ‌[(ﹲﹺ-=82)-ءﱠ--+90],ﱡ‌[ﹲﹺ--+ ++ءﱠ-4],ﱡ‌[--ﹲﹺ+ءﱠ-1],ﱡ‌[(ﹲﹺ+=45)- --ءﱠ+50])),!1))&&(ﱡ‌[--ﹲﹺ+ءﱠ---53]=function(ﱡ‌,ﹲﹺ){return function(){return ﱡ‌()instanceof ﹲﹺ()}}(ﱡ‌[++ﹲﹺ+ءﱠ---53],ﱡ‌[ﹲﹺ---ءﱠ--+49]))}(7849)})(function(ﹲﱢ,ﹴﱡ,ﱠﹸ,ﱡﱠ,ﹰﹺ,ﱣﱞ){try{return ﹴﱡ=function(ﹲﱢ,ﱢﹰ){try{return ﹲﱢ()}catch(ﱞﹰ){return ﱢﹰ()}},ﱠﹸ=function(ﹲﱢ){if(typeof \\u0061\\u0074\\u006f\\u0062==="function")return ﹴﱡ(function(ﱢﹰ,ﱞﱣ,ﹲ‌){for(ﱢﹰ=\\u0061\\u0074\\u006f\\u0062(ﹲﱢ),ﱞﱣ=[],ﹲ‌=0;ﹲ‌<ﱢﹰ.\\u006c\\u0065\\u006e\\u0067\\u0074\\u0068;ﹲ‌++)ﱞﱣ.\\u0070\\u0075\\u0073\\u0068(ﱢﹰ.\\u0063\\u0068\\u0061\\u0072\\u0043\\u006f\\u0064\\u0065\\u0041\\u0074(ﹲ‌)&255);return ﱞﱣ},function(){return ﹰﹺ(ﹲﱢ)});return ﹰﹺ(ﹲﱢ)},ﱡﱠ=function(ﹲﱢ,ﱢﹰ,ﱞﱣ,ﹲ‌,ﹴﹲ){ﱞﱣ=0,ﹲ‌=0;do ﹴﹲ=ﹲﱢ[ﱢﹰ.\\u0069++],ﱞﱣ+=(ﹴﹲ&127)*\\u004d\\u0061\\u0074\\u0068.\\u0070\\u006f\\u0077(2,ﹲ‌),ﹲ‌+=7;while(ﹴﹲ&128);return ﱞﱣ},ﹰﹺ=function(ﹲﱢ,ﱢﹰ,ﱞﱣ,ﹲ‌,ﹴﹲ,ﱣﹼ,ءﹺ,ﱟﹶ,ﹺ){ﱢﹰ="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",ﱞﱣ=[],ﹲ‌=0;while(ﹲ‌<ﹲﱢ.\\u006c\\u0065\\u006e\\u0067\\u0074\\u0068)ﹴﹲ=ﱢﹰ.\\u0069\\u006e\\u0064\\u0065\\u0078\\u004f\\u0066(ﹲﱢ.\\u0063\\u0068\\u0061\\u0072\\u0041\\u0074(ﹲ‌++)),ﱣﹼ=ﱢﹰ.\\u0069\\u006e\\u0064\\u0065\\u0078\\u004f\\u0066(ﹲﱢ.\\u0063\\u0068\\u0061\\u0072\\u0041\\u0074(ﹲ‌++)),ءﹺ=ﱢﹰ.\\u0069\\u006e\\u0064\\u0065\\u0078\\u004f\\u0066(ﹲﱢ.\\u0063\\u0068\\u0061\\u0072\\u0041\\u0074(ﹲ‌++)),ﱟﹶ=ﱢﹰ.\\u0069\\u006e\\u0064\\u0065\\u0078\\u004f\\u0066(ﹲﱢ.\\u0063\\u0068\\u0061\\u0072\\u0041\\u0074(ﹲ‌++)),ﹺ=ﹴﹲ<<18|ﱣﹼ<<12|(ءﹺ&63)<<6|ﱟﹶ&63,ﱞﱣ.\\u0070\\u0075\\u0073\\u0068(ﹺ>>16&255),ءﹺ!==64&&ﱞﱣ.\\u0070\\u0075\\u0073\\u0068(ﹺ>>8&255),ﱟﹶ!==64&&ﱞﱣ.\\u0070\\u0075\\u0073\\u0068(ﹺ&255);return ﱞﱣ},ﱣﱞ=function(ﹲﱢ,ﱢﹰ,ﱞﱣ,ﹲ‌){ﱢﹰ=ﱠﹸ(ﹲﱢ),ﱞﱣ=[],ﹲ‌={\\u0069:0};while(ﹲ‌.\\u0069<ﱢﹰ.\\u006c\\u0065\\u006e\\u0067\\u0074\\u0068)ﱞﱣ.\\u0070\\u0075\\u0073\\u0068(ﱡﱠ(ﱢﹰ,ﹲ‌));return ﱞﱣ},ﱣﱞ(ﹲﱢ)}catch(ﱞﹰ){return[]}}("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"),[[53062,45704,46166,32530,26801,2901,26228],[59352],[42645,19238],[53898,37280,705,41327,23052,2086],[27384,14737,17199,8940,33084,57613,55680,38963,12290],[14025],[62127,37129,2895,63228,56141,35553,64875,60559],[39392,22678,13058],[41054,24332,35621,55169,1550],[40334,19511],[44295,19345,27499,2504,59544,34615],[63265,32154,60490],[55913,35087,21378,3772,21992,64602],[35105,27084,53086],[52907,27988],[9632],[11462,23421,57914],[48885,24211,19386],[51572,43039,35618],[60851,29717,17457],[57548,33121,31324,10466],[13916],[16387],[59011],[17106],[26879,1828,8245],[12852],[12614],[37333,53329,7592,48192,59684,39179],[44019,19380,63910,59471,65500,41580,29153,12358,64411,43610,23482,7838,1568,42185,30485,14218,24615,7935,13285,12928,15729,10160,8825,16572,63164,30563],[34945,24223],[33336],[21533],[26625,3750],[8601,49203,22527,64050,51404,26996,53621,37084,53948,32559,56936,33990,49544,41213,10025,16091,29310,12713,5369,52395,2175,42799,60265,46838,33040,8384],[688,41800,4104,53924],[34369,15585],[32873,24847,22628],[36895],[46382,46065,54303,36413],[48890,58149,6231,48066,32891],[12782,20538],[19110],[22326,5533,34869,64146,61068,37677,51856,43777],[47880,56119,28042,3245,60440,47625,40922,16978,47597,43252,21826,7400,18893,10256,55140,47643,64603,40344,62120,37227,58697,33868,28116,62467,50521],[61860,61515,38974],[53559,45542,9814,56574,488],[57656,33565],[15407,24265],[59246,64198,20556,65278,40206],[11106,24566,24972,160],[36828,56954,64810,27549,30830,12239,19232,10705,21646],[1594,44227,1636,60826,17521],[60582,36695,7288,23843],[40767,15870,46949,56726,5703],[4429,45291,50393,60793,14654,59595],[21668,3991,43526,18464,40016],[400,41122,16916,8234,42496,17572,4797,20837,45473,53360,2930,54802,10480],[3085,57049,37885,54894,13938,57116,51515,26583],[26741,31141,37981,13595,56516,34145],[55083,35581,32010,7485],[34689,60844,9175,49743,17225],[14644,59892,32064,11514,39146,18704,17567,9110,64143,44970,4190,53997,64578,40593,41166,16722],[2792,27025,34762,9865,36525,29516,40315,17578],[57422,34505,31869],[8511,18403,3052,47690,46837,21823,24889,238],[6027,52781],[36526,23928,23953,7224,7542,23552,64605,28305,57824],[51282,59876,55440,35092,48438],[11920,13119],[25544,623,26836,8048],[57227,36267,30467,27964,29716,62928,48333],[28459,14331,53136,37438],[11786,19616,37069,20625,4149,46006,35695,10802,13699,21686,61897,45145,31050],[2982,24152,48699,25841,48272,48468,13426,27966,27819,7516,5777,20316,31645,10900,49353],[22992,6257],[62753,37837],[2946,48674,55275,39301,19474,31266,61931],[10245,55858,39376,51321,35130,59614,5846],[27569,5703,40438,17467,1459,42013,18019,11456,30872,59742,25186],[61078,45887,8760,49383,4774,20819,2574],[48886],[31941],[34398,25818,22216,7528,49335,58219,54546,46211],[60932,48311,47630,59573,35467,26815],[],[57932,33004,45155,61890,63316,59950],[39934,19027,51837,27095,19313,63942,24875,202,58283,33359],[28986,6128,5882,52019,65388,59086,56094,36575,56868,33935,33870,11670],[55021,38678,28065,29866,8729,20430,62588,37538],[64452,43618],[13400,53908,6625,18543,30432],[9617,52260,64591,27390],[2807,60092,53763],[11597,15858,50175,59031,28652,29186],[63175,38247,25358],[9753,17600,12038,56749],[62984],[41598,16819,14836],[3597,64764,27800,6918],[29108,4211,32494,25412,36444,30671,11971,20323,11167,31313,18991,6397,10043,50670,61299,37440,25865,1407,27641,15992,13170,12851,62618,60765,40628],[35657,16120,42970,64088,29483,63439],[58569,48499],[49170,26136,4164],[42802,48912,32043,11239],[62485,28662,17491,9910,518,25073,43,42739,22150,3945,8124,50742,2342,26969,42170,17701,11018,15091,49622,24653,3954,29216,33098,8263,31153,6246,14847,10417,22015,7268,27581,3740,47452,30753,22805,2243,30887,6432,10703],[35612,14799,61273,62453,263,41343,6600,22531,45179,45432,21233,62204,34189,11266,57913,33001,60129,36724,3512,62567,20998,12734,5877,30176,29203,4544,48950,58343,2926,47548,29502,30275,13547,54059,36126,54441,29873,7456,18188,9997,5868,19309,38527,15547,13234,15884,45251,53472,7123,50916,45051,21062,34838,12213,13330,14312,28022,7217,50708,44259,39679,23263,20933,4332,20764,4173,13318,55023,53713,37047,27507,2596,39981,19125,50898,61393,64685,39708,16672,24594,36865,13146,10741,55525,54291,38239,44689,55070,16440,25065,22094,3845,48572,44163,38535,15695,63804,59409,17758,25711,31136,59562,20477,28344,21818,3099,5336,52455,17,57647,1831,32320,65074,58112,1340,60425,17965,7956,2665,26951,50409,42170,21497,5553,55514,36804,5586,19633,41502,17369,53061,61988,54334,36155,46448,21574,51151,47454,54200,40425,18052,26026,32408,59269,11965,22190,16433,57702,11868,62084,63514,43277,30162,6920,18424,15097,40936,16672],[11651,23727],[44372,19336],[61457,48699],[39605],[29404,13142,43124,20273],[28435,32652,47056,64055,16313,9803,17871],[46393,32757,31875,12037],[30379,60231,1757],[33188,8192,52077,28206],[4194],[42801,19853,5059],[9318,17047],[8120,49812],[36921,21237,41998],[11710,19542,33899,26274,54501,37731,37386,12443,3290,56674,37288,20596,23526,1704,59411,40701,12897,20922,21753],[10502],[58433,33516,57300,48739],[34424],[40427,50260,20592,5023],[571,41169],[61977],[62265,40950,44899,20013,47538],[28131,15747,53752,37808,45370,53497,1624,42238,64883,26044,51625,39033],[38298,56382,20143,5451],[11184,13948,12776],[64832,58623,43611],[26320,31626],[25599,956,3157,57296],[9762,17415,6595,18529,3671,24059,43574],[3840,60717],[21336,5110,4433,21491,52516],[36109,21809],[27165,63513,59508,34601,18735,59577,51917],[36884,54805,29284],[27544,5790],[34974,59140,25457],[37499],[15754,9248,52498],[63308,46829],[13119,54003,11113,54933],[25628],[15441,24550,45762,24447,12709,53683,3593,28058,1516,58440],[52378,27435,41132,18132],[39254],[21783,3262,45443],[35181,27585],[1236,23932],[63062,62701],[10547,19228,11828,19924,29188,28723],[5268],[36439,11602,20529,62133,13978,22312,19756,62649],[51504,27086],[4069,22036],[49607,41086,16195],[2440,42900],[57641,32974,63055],[24566,1718,35056,63809,10415],[48815,44879,254],[20832,5099],[13223,22187,7532,48585,27531,6568,19360,10928,33632,9875,49449,57562,45294,45848,58694],[61578,40741],[37086,13149,749],[25033,99,2598,59542,19892,5197],[53464,29040,48518,23613,43302],[31360,10528,28664,4670,2956],[38418,22445,32471,9507,22418,6770,58771,40861,62682,37666,43814,19126,21043,12526,54596],[14927],[32261,32180,59591],[49684,40970,43174],[19042,10738],[4280],[26747,1688,26942,3067,51068],[58862,48138,39174],[44064,22187,58004],[27042,6266,22372,5506,9666],[54688,35920,8839],[36171,56305,59979,63943],[27241,2309,48217,59362,43057,18939,18147],[47586,43122,25261,1866],[12712,53643],[43232],[5982,19422,57155],[16723,57589,30164],[16821,24966,42422,50257,19321],[16294,57916,24546,1662],[61162,32014,48989,57875,32691,8810],[37972,13029,38316],[53303,28358,49737,41453,41396],[50777],[48291,56651,46566,46097,1078],[28132,5143],[60777,36035,9771,19392,10127,18968,12067],[1668,64684,33989,24427],[19522,30102,52903],[2977,55860,10053],[64009,47278,46927,54753,50098],[28544],[26843,2426,50773,64736,63684],[22307,65339,42669,49035,52194],[60484,48529,4058,21182,20999],[988,61022,64912,42156],[21952,13420,35898,14875,62706,40241],[428,41130],[41809],[16354,8784],[24543,578,11376,52874],[32312],[31453,59149],[15510,61076,39744],[14629,10508,20941,12402,60180,63264,38666,31733,48275,42321,47036,56876,45513,61514,27279,2401,53776,28791,17266,25569,60514,36215],[45642,53478,49552,41038,37299,61525,47399],[511],[3045],[7968,50628,25457,1581,60335],[42630,17833],[43095,52960,25843,31878,5409,21974,20373],[21854,29571,53031,46470],[31542,10909],[12028,20295,48459],[18627,11107,61517],[43787,56228],[59438,34777,671],[57436,36514],[35332,30776,48893],[56153,36377],[9500,51133,4777],[12536,20415],[61465,30425,28263],[55739,39036,36189,22015],[46461,44459,41362,16466,39631],[11318,18969,19707,60709],[39696,55743],[40689,49988,51997,47915,4761],[60150,39232,51815],[8064],[22557,2695],[29893,7545,65073],[5243,20391,20575],[1675,42316],[23027,6171],[51126,43611,29537],[41498,16892],[62973,48182],[1805,42801,58455],[20879,28837,36396,56337,13140,12792,24790,1904],[6019,52732],[11132,57248,48352,28491],[53982,29338],[50654,25718,27564],[48197,23541,61898,61540],[3553,29815,46879],[61011,37882,31357,10525,1458,42375,32078],[10838,14529,25732],[16028,56502,46060],[49674,41124,39385,18497],[45987,48722,22953,2112,39387,55366,20357,30269,26139,3254,10743,63532,52792,38345,65010,48312,18169,7472],[51474,26424,59277,35379],[28474,13278,57753],[28799,4024,39258,51392],[43464,55392,60848,29799,9829,17682],[11114,19155],[65087,42176,9705,17415,39489],[10022,19415,31641,65179,39399],[18577,14628,48848,32110,1678],[42065,20115],[51257],[63895,59897],[63129,40766,1024,42926,60602],[65087,44273,9664,23654,38389,22015],[3900,22252,19897,15376,58475],[27583],[64866,60424],[4067,45576,38874,31358],[59004,40912,13387,54760,2786,59669,45072],[6503,51213,33958,32087,33523,8496,26559,1577,7377,48489,64665,27983],[25988,4020,26086,3145,44148,55999,51368,65154,37697,13025,29610,62020,22416],[41309,49653],[43212,47472,56994,35977,407,24623,46965,61367,20797,4336],[22851,2329,51158,64124,55492],[52904,48448],[42239,17209,56451,34089,34127,9710,55260],[55858,35800,28552,30131,21862,7170,55357,35581,30482,6076,36171,11252,53340],[27352,14992,29502],[55000,46462,18724],[3106,44660,63402,63106,2708,24452,43589,47345,61343,46603,13378,54246,1326],[25880,816,21231,12612,2645,61191,23409,2719,20601,6016],[46141,54267,62118],[41065,16643],[11482,24400,46012],[42861,18968],[29527,62198],[47698,27606,30249],[34764,26203,13583,54751],[18951,14375,28814,4535],[27058,2170,6492],[2347,59661,25364,1699,5228],[24518,1636,16198,8943],[62731],[31115,59431,63001,39901,59926,39320],[3050,46732,56788],[32769,11945,36422],[26612,7706],[45721,45280,6721,19370,21186,32616,55982,63797,8235,49669,41348,49187],[63291,39678],[6421,47396],[61552,38828,2332,43486,13388,22223,16495],[64800,42292,52966,44930,62887],[65031,44050],[35729,54840,6636,51265,46055,63105],[27734,30441,38133,56669,383,24681,53143,40615,63390,39489],[10261,55841,49200,41420,49903,25437,50099],[13071,55082],[7580,19522,29878,60768,57190,36290,47393,47276,55461,35157,16834,24672,20328,5665,57131],[14384,10992,38625,21840,2515],[49770,41230,59509,34496,8520,16870],[5862,20106,26630,6560,50394,42385],[59442,35298,37091,61808,19277,10892,47513],[64020,43951],[5010,21163],[669,26448,55378],[30389,11395,55345,36484,52815,30142,28318,5504],[28068,3084,34562,9514],[11614,21633,4313,53581,108,44921],[10133,17977,4062,54160,21654,7497,36337,27674,7332,56662,11723,23679,19318,31178,52371,30533,59352,34325],[61612,45434],[47988,43955,34137,9239,32736,26115,6290,19389,5907,32453,9999,19906,61842,36946,58304],[30724,28206,42454,19461,36064,21865],[63593,64399,24167,3200,11062,18896,45982,53654,13812],[4466,53468,15361,10943,42254,64698,31656,28238],[50627,42087,10644,23474,63256,44373],[47172,47613,9061,50825,35108],[8387,17249,38099,22374,46703,46414,5923,23823,22997,2079,49512],[61261,36584,8228],[21873,13345,40677,51081,23080,2967,29382],[47555,26729,16842,57440],[59409,34749],[41614,16550,3509,27750,22057,5127,58082,40772,1244,42308,23215],[50886,42346,34625,12256,25890,1171,48585,27759,29929,62265],[62080,37798,33150,57385,28306,7452],[57868,32810],[64844,27624,15280,23174,43328,22767,95,41247,45787,20841,45032,53830,48524,25679,8445],[44503,56402,28202],[12056,21785,39366],[13678,21516,11782,54455,55926,35088,37966,19944,31878,10073,43944,64130,23730,1384,8414],[32695,57937],[9829,50455,10425,50965],[11077,55281,34059,9564,65333,25316,15543,28024,557,41153,32700,8800,27358,3851,38111],[48455,56575,44289],[32004,64675],[57380,36862,48248,23326,34465,59259],[38635,19824,41458,16481,22268],[47821,56174,59329,34406,37998,54156,50501,58851,22417,5696],[43662,22820,28724],[35544,10608,63404,64064,42669,20331,17910],[7854,57173,35359,22537,46009,65433,11881,54036,26375],[44476,23650],[43984,65112,17222,59108,50314,44729,51448],[28079,29834,16379,8876],[55303,36517,28447,14087],[13394,22265,64100],[47668,55429,32158,7222,40725],[4400],[6020,18946],[61382,37493],[2611,43258,14937,63741,53629,36924,10250,17968,49220,44722,56317,35381,26938,7123],[38703,54669,56587,33983,51771,38903,41556,16875],[8718,49372],[18497,27360,7197,50907,60905,37975,19208,27048,34999,10600,43739,18797,60661],[53269,40495,47084,27140],[32449,58743,61781],[8640,49279,53753],[35673,22249],[3866],[15580,25962,36108],[53523,28981,22288],[49154,65211,29976,5559],[56195,36367],[8196,50729,27174,2259,11967,56687,61962],[1443,42059,49364,41287,14411],[57905,32779,17924,58502,36846],[31311,7139,20084],[46212,21793,5716,21905,28221],[15029,11121,55369,35575,53785],[27507,2770,42968,19019],[18431,31279],[64240,31130,41223,49328],[8219,24093,13287,53907,14351,63903,44075],[64811,40143,10656],[49140,25501,33684,58940,11962,54638,55364,38895],[16912,45812,58381,1188,54861,59088],[60579,63426,60600,6902,47149],[58386,34346,2576,43199],[12064,8613,21756,23390,21667,26850],[42958,15437,46416,48339,2281],[59436,48640,33660,8764],[12851,61465,9336],[50313],[21505,29356,57275,33377],[17970,11660,59874,35010,35770,31301,35592,10541,19432,64024,1316],[37063,55159,17245,8603,10992],[41307,53121,18357,32311,40433,19551],[38895,23135,50169,42667],[14380,22942,13796,56440],[16780,57530,24771],[4737,45355,12840,12302,59283,35376,42167],[50110,41546],[29240,12504,62165,61735,8879,16762],[43757,20121,42159,17156,55900,35087,19066,63674],[26566,2664,22591,14061,39320],[15065,59748],[15763,25749,7921],[19124,6006],[35803,31325,61121],[30884,7809,39175],[10596,51669,48051,43543,24339,1313],[20497,4789],[54619,31971,2558,43040,12234,65110,42383,17578],[32087,27887,38407],[35342,31154,12348,65031],[5113,52921,14519,65310,36369],[51830,31197,46251,63307,27290,14607,64784,40386,50192,42657,62855],[8118,17994,14762,55368],[57519,40771,40252,24021,24740,335,10850,18903,55842,35026,11980,19783,64194,47466,46343,62632],[38712,19933,63745,63822],[56835,39950,3733,29990,22086,5362],[45473,45144,228,24973,48863,58239,56573,33950,1804,25908,22909,2485],[62863,62501,30313,5328,1286,28068,11231],[12791,61519,54862,29928],[42826,24040,18155],[60688,58102,14317,41953,57837],[57421,8094,25946]],function(){try{return this||typeof \\u0067\\u006c\\u006f\\u0062\\u0061\\u006c\\u0054\\u0068\\u0069\\u0073==="object"&&\\u0067\\u006c\\u006f\\u0062\\u0061\\u006c\\u0054\\u0068\\u0069\\u0073||typeof \\u0073\\u0065\\u006c\\u0066==="object"&&\\u0073\\u0065\\u006c\\u0066||typeof \\u0077\\u0069\\u006e\\u0064\\u006f\\u0077==="object"&&\\u0077\\u0069\\u006e\\u0064\\u006f\\u0077||typeof \\u0067\\u006c\\u006f\\u0062\\u0061\\u006c==="object"&&\\u0067\\u006c\\u006f\\u0062\\u0061\\u006c||\\u0046\\u0075\\u006e\\u0063\\u0074\\u0069\\u006f\\u006e("return this")()}catch(ﱞﹰ){return{}}}(),{},\\u004f\\u0062\\u006a\\u0065\\u0063\\u0074.\\u0063\\u0061\\u006c\\u006c.\\u0062\\u0069\\u006e\\u0064(\\u0041\\u0072\\u0072\\u0061\\u0079.\\u0062\\u0069\\u006e\\u0064),\\u0041\\u0072\\u0072\\u0061\\u0079.\\u0061\\u0070\\u0070\\u006c\\u0079.\\u0062\\u0069\\u006e\\u0064(\\u004e\\u0075\\u006d\\u0062\\u0065\\u0072.\\u0062\\u0069\\u006e\\u0064),\\u004e\\u0075\\u006d\\u0062\\u0065\\u0072.\\u0062\\u0069\\u006e\\u0064.\\u0062\\u0069\\u006e\\u0064(\\u004f\\u0062\\u006a\\u0065\\u0063\\u0074.\\u0062\\u0069\\u006e\\u0064),\\u004f\\u0062\\u006a\\u0065\\u0063\\u0074.\\u0063\\u0061\\u006c\\u006c.\\u0062\\u0069\\u006e\\u0064([].\\u0070\\u0075\\u0073\\u0068),\\u0041\\u0072\\u0072\\u0061\\u0079.\\u0063\\u0061\\u006c\\u006c.\\u0062\\u0069\\u006e\\u0064([].\\u0063\\u006f\\u006e\\u0063\\u0061\\u0074),\\u004e\\u0075\\u006d\\u0062\\u0065\\u0072.\\u0061\\u0070\\u0070\\u006c\\u0079.\\u0062\\u0069\\u006e\\u0064(\\u0053\\u0074\\u0072\\u0069\\u006e\\u0067.\\u0066\\u0072\\u006f\\u006d\\u0043\\u0068\\u0061\\u0072\\u0043\\u006f\\u0064\\u0065,null),\\u004f\\u0062\\u006a\\u0065\\u0063\\u0074.\\u0064\\u0065\\u0066\\u0069\\u006e\\u0065\\u0050\\u0072\\u006f\\u0070\\u0065\\u0072\\u0074\\u0079.\\u0062\\u0069\\u006e\\u0064(\\u004f\\u0062\\u006a\\u0065\\u0063\\u0074),\\u004f\\u0062\\u006a\\u0065\\u0063\\u0074.\\u0067\\u0065\\u0074\\u004f\\u0077\\u006e\\u0050\\u0072\\u006f\\u0070\\u0065\\u0072\\u0074\\u0079\\u0044\\u0065\\u0073\\u0063\\u0072\\u0069\\u0070\\u0074\\u006f\\u0072.\\u0062\\u0069\\u006e\\u0064(\\u004f\\u0062\\u006a\\u0065\\u0063\\u0074),\\u0052\\u0065\\u0067\\u0045\\u0078\\u0070,function(){return typeof \\u0042\\u0069\\u0067\\u0049\\u006e\\u0074!=="undefined"?\\u0042\\u0069\\u0067\\u0049\\u006e\\u0074:void 0}(),\\u0053\\u0074\\u0072\\u0069\\u006e\\u0067.\\u0066\\u0072\\u006f\\u006d\\u0043\\u0068\\u0061\\u0072\\u0043\\u006f\\u0064\\u0065,function(ﱢﹰ,ﹸﹸ,ﱠﹺ,ﱠﹸ){return ﱢﹰ=function(){}.\\u0063\\u0061\\u006c\\u006c,ﹸﹸ=ﱢﹰ.\\u0062\\u0069\\u006e\\u0064("".\\u0073\\u0070\\u006c\\u0069\\u0074),ﱠﹺ=ﱢﹰ.\\u0062\\u0069\\u006e\\u0064([].\\u0072\\u0065\\u0076\\u0065\\u0072\\u0073\\u0065),ﱠﹸ=ﱢﹰ.\\u0062\\u0069\\u006e\\u0064([].\\u006a\\u006f\\u0069\\u006e),function(ﱡ‌){return ﱠﹸ(ﱠﹺ(ﹸﹸ(ﱡ‌,"")),"")}}(),[]);
`},{file:"墨澜聚合音源 v2.2.0.js",script:`/*!
 * @name 墨澜聚合音源
 * @description 全平台支持flac，酷狗、QQ、网易支持母带（全用的是别人的接口，类似于全豆要）
 * @version 2.2.0
 * @author 白姬9527(2449067834)
 *
 */

const { EVENT_NAMES, request, on, send, utils, env, version, currentScriptInfo } = globalThis.lx

// ==================== 解析头部注解 ====================

const currentScript = currentScriptInfo
  ? currentScriptInfo.rawScript
  : (typeof document !== 'undefined' ? document.currentScript?.textContent || '' : '')

const parseHeader = (str) => {
  const comment = /^\\/\\*!(?:.|\\n)+?\\*\\//.exec(str)?.[0]
  if (!comment) return {}
  const result = {}
  const pairs = [
    { key: 'tx_cookie', regex: /\\*\\s*@tx_cookie\\s+(.+)/ },
    { key: 'wy_cookie', regex: /\\*\\s*@wy_cookie\\s+(.+)/ },
  ]
  for (const { key, regex } of pairs) {
    const match = regex.exec(comment)
    const val = match?.[1]?.trim()
    result[key] = (!val || val === 'null') ? '' : val
  }
  return result
}

const config = parseHeader(currentScript)
const TX_COOKIE = config.tx_cookie
const WY_COOKIE = config.wy_cookie
const HAS_TX_COOKIE = !!TX_COOKIE
const HAS_WY_COOKIE = !!WY_COOKIE

// ==================== 音质列表（参照ikun音源格式） ====================

const MUSIC_QUALITY = JSON.parse(HAS_TX_COOKIE && HAS_WY_COOKIE
  ? '{"tx":["128k","320k","flac","flac24bit","hires","atmos","atmos_plus","master"],"wy":["128k","320k","flac","flac24bit","hires","atmos","master"],"kw":["128k","192k","320k","flac","flac24bit"],"kg":["128k","320k","flac","hires","atmos","master"],"mg":["128k","320k","flac"]}'
  : HAS_TX_COOKIE
    ? '{"tx":["128k","320k","flac","flac24bit","hires","atmos","atmos_plus","master"],"wy":["128k","320k","flac"],"kw":["128k","192k","320k","flac","flac24bit"],"kg":["128k","320k","flac","hires","atmos","master"],"mg":["128k","320k","flac"]}'
    : HAS_WY_COOKIE
      ? '{"tx":["128k","320k","flac"],"wy":["128k","320k","flac","flac24bit","hires","atmos","master"],"kw":["128k","192k","320k","flac","flac24bit"],"kg":["128k","320k","flac","hires","atmos","master"],"mg":["128k","320k","flac"]}'
      : '{"tx":["128k","320k","flac"],"wy":["128k","320k","flac"],"kw":["128k","192k","320k","flac","flac24bit"],"kg":["128k","320k","flac","hires","atmos","master"],"mg":["128k","320k","flac"]}'
)

const MUSIC_SOURCE = Object.keys(MUSIC_QUALITY)

// ==================== 工具函数 ====================

const httpFetch = (url, options = { method: 'GET' }) => new Promise((resolve, reject) => {
  request(url, options, (err, resp) => {
    if (err) return reject(err)
    let body = resp.body
    if (typeof body === 'string') {
      const trimmed = body.trim()
      if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"')) {
        try { body = JSON.parse(trimmed) } catch (e) {}
      }
    }
    resolve({ body, statusCode: resp.statusCode, headers: resp.headers || {} })
  })
})

const md5 = (str) => utils.crypto.md5(str)

const randomGuid = () => {
  const hex = '0123456789abcdef'
  let guid = ''
  for (let i = 0; i < 32; i++) guid += hex[Math.floor(Math.random() * 16)]
  return guid
}

const aesEncrypt = (data, key, iv, mode) => {
  if (!version) mode = mode.split('-').pop()
  return utils.crypto.aesEncrypt(data, mode, key, iv)
}

const buf2hex = (buffer) => {
  return version
    ? utils.buffer.bufToString(buffer, 'hex')
    : [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('')
}

const wyEapi = (url, object) => {
  const eapiKey = 'e82ckenh8dichen8'
  const text = typeof object === 'object' ? JSON.stringify(object) : object
  const digest = md5('nobody' + url + 'use' + text + 'md5forencrypt')
  const data = url + '-36cd479b6b5-' + text + '-36cd479b6b5-' + digest
  return { params: buf2hex(aesEncrypt(data, eapiKey, '', 'aes-128-ecb')).toUpperCase() }
}

const objToForm = (obj) => Object.keys(obj).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])).join('&')

const extractUrl = (obj, paths) => {
  for (const path of paths) {
    let val = obj
    for (const key of path) {
      if (val == null) { val = undefined; break }
      val = val[key]
    }
    if (Array.isArray(val)) val = val[0]
    if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) return val
    if (typeof val === 'string' && val.startsWith('//')) return 'https:' + val
  }
  return ''
}

const cleanUrl = (url) => {
  if (!url) return ''
  const s = String(url).replace(/\\\\?u0026/gi, '&').replace(/\\\\&/g, '&').replace(/\\$/g, '&')
  const idx = s.indexOf('?')
  return idx > 0 ? s.substring(0, idx) : s
}

// ==================== 通用音质转Level工具 ====================

const qualityToLevel = (quality) => {
  const map = {
    '128k': 'standard',
    '192k': 'standard',
    '320k': 'exhigh',
    'flac': 'lossless',
    'flac24bit': 'lossless',
    'hires': 'lossless',
    'atmos': 'lossless',
    'atmos_plus': 'lossless',
    'master': 'lossless',
  }
  return map[quality] || 'standard'
}

// ==================== SHA256 工具（用于 Hello World API 签名） ====================

const sha256 = (function() {
  var HEX_CHARS = '0123456789abcdef'.split('');
  function Sha256() {
    this.blocks = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    this.h0 = 0x6a09e667;
    this.h1 = 0xbb67ae85;
    this.h2 = 0x3c6ef372;
    this.h3 = 0xa54ff53a;
    this.h4 = 0x510e527f;
    this.h5 = 0x9b05688c;
    this.h6 = 0x1f83d9ab;
    this.h7 = 0x5be0cd19;
    this.block = this.start = this.bytes = this.hBytes = 0;
    this.finalized = this.hashed = false;
    this.first = true;
  }
  Sha256.prototype.update = function(message) {
    if (this.finalized) return;
    var notString = typeof message !== 'string';
    var blocks = this.blocks;
    for (var i = 0; i < message.length; i++) {
      if (this.hashed) {
        this.hashed = false;
        blocks[0] = this.block;
        blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
      }
      var code = notString ? message[i] : message.charCodeAt(i);
      blocks[this.start >> 2] |= code << (24 - (this.start % 4) * 8);
      this.start++;
      if (this.start === 64) {
        this.block = blocks[16];
        this.start = 0;
        this.hash();
        this.hashed = true;
      }
    }
    this.bytes += message.length;
    if (this.bytes > 4294967295) {
      this.hBytes += this.bytes / 4294967296 << 0;
      this.bytes = this.bytes % 4294967296;
    }
    return this;
  };
  Sha256.prototype.finalize = function() {
    if (this.finalized) return;
    this.finalized = true;
    var blocks = this.blocks;
    var i = this.start;
    blocks[16] = this.block;
    blocks[i >> 2] |= 0x80 << (24 - (i % 4) * 8);
    this.block = blocks[16];
    if (i >= 56) {
      if (!this.hashed) this.hash();
      blocks[0] = this.block;
      blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
    }
    blocks[14] = this.hBytes << 3 | this.bytes >>> 29;
    blocks[15] = this.bytes << 3;
    this.hash();
  };
  Sha256.prototype.hash = function() {
    var K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    var a = this.h0, b = this.h1, c = this.h2, d = this.h3, e = this.h4, f = this.h5, g = this.h6, h = this.h7, blocks = this.blocks;
    for (var j = 0; j < 64; j++) {
      if (j >= 16) {
        var w0 = blocks[j - 15];
        var w1 = blocks[j - 2];
        var s0 = ((w0 >>> 7) | (w0 << 25)) ^ ((w0 >>> 18) | (w0 << 14)) ^ (w0 >>> 3);
        var s1 = ((w1 >>> 17) | (w1 << 15)) ^ ((w1 >>> 19) | (w1 << 13)) ^ (w1 >>> 10);
        blocks[j] = blocks[j - 16] + s0 + blocks[j - 7] + s1;
      }
      var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      var ch = (e & f) ^ ((~e) & g);
      var temp1 = h + S1 + ch + K[j] + (blocks[j] >>> 0);
      var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      var maj = (a & b) ^ (a & c) ^ (b & c);
      var temp2 = S0 + maj;
      h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    this.h0 = (this.h0 + a) >>> 0;
    this.h1 = (this.h1 + b) >>> 0;
    this.h2 = (this.h2 + c) >>> 0;
    this.h3 = (this.h3 + d) >>> 0;
    this.h4 = (this.h4 + e) >>> 0;
    this.h5 = (this.h5 + f) >>> 0;
    this.h6 = (this.h6 + g) >>> 0;
    this.h7 = (this.h7 + h) >>> 0;
  };
  Sha256.prototype.hex = function() {
    this.finalize();
    var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4, h5 = this.h5, h6 = this.h6, h7 = this.h7;
    return HEX_CHARS[(h0 >> 28) & 0x0F] + HEX_CHARS[(h0 >> 24) & 0x0F] + HEX_CHARS[(h0 >> 20) & 0x0F] + HEX_CHARS[(h0 >> 16) & 0x0F] + HEX_CHARS[(h0 >> 12) & 0x0F] + HEX_CHARS[(h0 >> 8) & 0x0F] + HEX_CHARS[(h0 >> 4) & 0x0F] + HEX_CHARS[h0 & 0x0F] + HEX_CHARS[(h1 >> 28) & 0x0F] + HEX_CHARS[(h1 >> 24) & 0x0F] + HEX_CHARS[(h1 >> 20) & 0x0F] + HEX_CHARS[(h1 >> 16) & 0x0F] + HEX_CHARS[(h1 >> 12) & 0x0F] + HEX_CHARS[(h1 >> 8) & 0x0F] + HEX_CHARS[(h1 >> 4) & 0x0F] + HEX_CHARS[h1 & 0x0F] + HEX_CHARS[(h2 >> 28) & 0x0F] + HEX_CHARS[(h2 >> 24) & 0x0F] + HEX_CHARS[(h2 >> 20) & 0x0F] + HEX_CHARS[(h2 >> 16) & 0x0F] + HEX_CHARS[(h2 >> 12) & 0x0F] + HEX_CHARS[(h2 >> 8) & 0x0F] + HEX_CHARS[(h2 >> 4) & 0x0F] + HEX_CHARS[h2 & 0x0F] + HEX_CHARS[(h3 >> 28) & 0x0F] + HEX_CHARS[(h3 >> 24) & 0x0F] + HEX_CHARS[(h3 >> 20) & 0x0F] + HEX_CHARS[(h3 >> 16) & 0x0F] + HEX_CHARS[(h3 >> 12) & 0x0F] + HEX_CHARS[(h3 >> 8) & 0x0F] + HEX_CHARS[(h3 >> 4) & 0x0F] + HEX_CHARS[h3 & 0x0F] + HEX_CHARS[(h4 >> 28) & 0x0F] + HEX_CHARS[(h4 >> 24) & 0x0F] + HEX_CHARS[(h4 >> 20) & 0x0F] + HEX_CHARS[(h4 >> 16) & 0x0F] + HEX_CHARS[(h4 >> 12) & 0x0F] + HEX_CHARS[(h4 >> 8) & 0x0F] + HEX_CHARS[(h4 >> 4) & 0x0F] + HEX_CHARS[h4 & 0x0F] + HEX_CHARS[(h5 >> 28) & 0x0F] + HEX_CHARS[(h5 >> 24) & 0x0F] + HEX_CHARS[(h5 >> 20) & 0x0F] + HEX_CHARS[(h5 >> 16) & 0x0F] + HEX_CHARS[(h5 >> 12) & 0x0F] + HEX_CHARS[(h5 >> 8) & 0x0F] + HEX_CHARS[(h5 >> 4) & 0x0F] + HEX_CHARS[h5 & 0x0F] + HEX_CHARS[(h6 >> 28) & 0x0F] + HEX_CHARS[(h6 >> 24) & 0x0F] + HEX_CHARS[(h6 >> 20) & 0x0F] + HEX_CHARS[(h6 >> 16) & 0x0F] + HEX_CHARS[(h6 >> 12) & 0x0F] + HEX_CHARS[(h6 >> 8) & 0x0F] + HEX_CHARS[(h6 >> 4) & 0x0F] + HEX_CHARS[h6 & 0x0F] + HEX_CHARS[(h7 >> 28) & 0x0F] + HEX_CHARS[(h7 >> 24) & 0x0F] + HEX_CHARS[(h7 >> 20) & 0x0F] + HEX_CHARS[(h7 >> 16) & 0x0F] + HEX_CHARS[(h7 >> 12) & 0x0F] + HEX_CHARS[(h7 >> 8) & 0x0F] + HEX_CHARS[(h7 >> 4) & 0x0F] + HEX_CHARS[h7 & 0x0F];
  };
  return function(message) {
    return new Sha256().update(message).hex();
  };
})();

const HELLO_WORLD_API_KEY = 'lxmusic';
const HELLO_WORLD_SECRET_KEY = 'JaJ?a7Nwk_Fgj?2o:znAkst';
const HELLO_WORLD_SCRIPT_MD5 = '1888f9865338afe6d5534b35171c61a4';
const HELLO_WORLD_API_URL = 'https://88.lxmusic.xn--fiqs8s';

const helloWorldSign = (requestPath) => sha256(requestPath + HELLO_WORLD_SCRIPT_MD5 + HELLO_WORLD_SECRET_KEY);

const HYW_API_BASE = 'http://103.79.184.97';
const HYW_CARD_KEY = 'MOLAN-BAIJI';

// ==================== QQ 音乐音质文件映射 ====================

const TX_FILE_CONFIG = {
  '128k': { s: 'M500', e: '.mp3', br: '128k' },
  '320k': { s: 'M800', e: '.mp3', br: '320k' },
  flac: { s: 'F000', e: '.flac', br: 'flac' },
  flac24bit: { s: 'AI00', e: '.flac', br: 'flac24bit' },
  hires: { s: 'AI00', e: '.flac', br: 'hires' },
  atmos: { s: 'AI00', e: '.flac', br: 'atmos' },
  atmos_plus: { s: 'AI00', e: '.flac', br: 'atmos' },
  master: { s: 'AI00', e: '.flac', br: 'master' },
}

// ==================== 网易云音质映射 ====================

const WY_LEVEL_MAP = {
  '128k': 'standard',
  '320k': 'exhigh',
  flac: 'lossless',
  flac24bit: 'hires',
  hires: 'hires',
  atmos: 'sky',
  master: 'jymaster',
}

const WY_BR_MAP = {
  '128k': 128000,
  '320k': 320000,
  flac: 999000,
  flac24bit: 999000,
  hires: 999001,
  atmos: 999002,
  master: 999003,
}

// ==================== 酷我音质Level映射（笒鬼鬼等专用） ====================

const KW_LEVEL_MAP = {
  '128k': '128k',
  '192k': '128k',
  '320k': '320k',
  flac: 'lossless',
  flac24bit: 'lossless',
}

// ==================== 酷狗音质Level映射（长青SVIP音源二改版专用） ====================

const KG_LEVEL_MAP = {
  '128k': 'standard',
  '192k': 'standard',
  '320k': 'exhigh',
  flac: 'lossless',
  flac24bit: 'hires',
  hires: 'hires',
  atmos: 'atmos',
  atmos_plus: 'atmos',
  master: 'clear',
}

// ==================== 酷我流媒体音质Level映射（175.27.166.236:8928 专用） ====================

const KW_STREAM_LEVEL_MAP = {
  '128k': '128k',
  '192k': '128k',
  '320k': '320k',
  flac: 'flac',
  flac24bit: 'flac',
  hires: 'hires',
  atmos: 'atmos',
  atmos_plus: 'atmos_plus',
  master: 'master',
}

// ==================== Fish API 签名工具 ====================

const FISH_DOMAIN = 'music.gdstudio.xyz'
const FISH_VERSION = '20260510'

const fishSign = async (secret) => {
  const timeRes = await httpFetch('https://' + FISH_DOMAIN + '/time', { method: 'GET', timeout: 10000 })
  const timeStr = String(Number(timeRes.body) || Date.now()).slice(0, 9)
  const signInput = FISH_DOMAIN + '|' + FISH_VERSION + '|' + timeStr + '|' + secret
  return md5(signInput).slice(-8).toUpperCase()
}

const fishPost = async (params, secret) => {
  const sign = await fishSign(secret)
  params.s = sign
  const body = objToForm(params)
  const res = await httpFetch('https://' + FISH_DOMAIN + '/api.php', {
    method: 'POST',
    timeout: 15000,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Origin: 'https://' + FISH_DOMAIN,
      Referer: 'https://' + FISH_DOMAIN + '/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: body,
  })
  return res.body
}

// ==================== QQ音乐 后端接口列表（按优先级排列） ====================

const TX_BACKENDS = [

  // === 后端1: QQ官方接口（带Cookie可解锁VIP） ===
  {
    name: 'QQ官方',
    fetch: async (songmid, quality) => {
      const fileInfo = TX_FILE_CONFIG[quality]
      if (!fileInfo) throw new Error('不支持的音质')
      const guid = randomGuid()
      const file = fileInfo.s + songmid + fileInfo.e
      const reqData = {
        req_0: {
          module: 'vkey.GetVkeyServer',
          method: 'CgiGetVkey',
          param: { filename: [file], guid, songmid: [songmid], songtype: [0], uin: '0', loginflag: HAS_TX_COOKIE ? 1 : 0, platform: '20' },
        },
        loginUin: '0',
        comm: { uin: '0', format: 'json', ct: 24, cv: 0 },
      }
      const headers = { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0', Referer: 'https://y.qq.com/' }
      if (HAS_TX_COOKIE) headers.Cookie = TX_COOKIE
      const res = await httpFetch('https://u.y.qq.com/cgi-bin/musicu.fcg', { method: 'POST', headers, body: JSON.stringify(reqData) })
      const d = res.body
      if (d && d.req_0 && d.req_0.data && d.req_0.data.midurlinfo && d.req_0.data.midurlinfo[0] && d.req_0.data.midurlinfo[0].purl) {
        const sip = d.req_0.data.sip || ['https://isure.stream.qqmusic.qq.com/']
        return sip[Math.floor(Math.random() * sip.length)] + d.req_0.data.midurlinfo[0].purl
      }
      throw new Error('QQ官方: 无数据')
    },
  },

  // === 后端2: 星海音乐源主后端（yy.zddyr.top） ===
  {
    name: '星海主后端',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://yy.zddyr.top/lx/api/?source=qq&songmid=' + songmid + '&quality=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      throw new Error('星海主后端: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端3: 星海音乐源备用后端（zrcdy） ===
  {
    name: '星海备后端',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://zrcdy.dpdns.org/lx/api/api.php?source=qq&songmid=' + songmid + '&quality=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      throw new Error('星海备后端: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端4: 溯音API（oiapi.net） ===
  {
    name: '溯音QQ',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': '7', '320k': '5', flac: '4', flac24bit: '1', hires: '1', atmos: '1', master: '1' }
      const br = brMap[quality] || '7'
      const res = await httpFetch('https://oiapi.net/api/QQ_Music?key=oiapi-ef6133b7-ac2f-dc7d-878c-d3e207a82575&type=json&br=' + br + '&n=1&mid=' + songmid, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['data', 'music'], ['data', 'url'], ['url']])
      if (url) return url
      throw new Error('溯音QQ: 无数据')
    },
  },

  // === 后端5: xcvts API（fish源主用） ===
  {
    name: 'xcvts',
    fetch: async (songmid, quality) => {
      const apiKeys = ['78993344b9bf1105655599009cdba3d2', 'ce778eb0d1858edfb4b2071a115f1edf']
      const qualityMap = { '128k': 'standard', '320k': 'exhigh', flac: 'lossless', flac24bit: 'hires' }
      const q = qualityMap[quality] || 'standard'
      const errors = []
      for (const key of apiKeys) {
        try {
          const res = await httpFetch('https://api.xcvts.cn/api/music/qq?apiKey=' + key + '&mid=' + songmid + '&type=' + q, {
            method: 'GET', timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
          })
          const d = res.body
          const url = extractUrl(d, [['data', 'music'], ['data', 'url'], ['url']])
          if (url) return url
        } catch (e) { errors.push(e.message) }
      }
      throw new Error('xcvts: ' + errors.join(' | '))
    },
  },

  // === 后端6: vkeys API ===
  {
    name: 'vkeys',
    fetch: async (songmid, quality) => {
      const qualityMap = { '128k': '8', '320k': '9', flac: '10', flac24bit: '16', hires: '14', atmos: '13', atmos_plus: '12', master: '11' }
      const q = qualityMap[quality]
      if (!q) throw new Error('vkeys 不支持的音质')
      const res = await httpFetch('https://api.vkeys.cn/v2/music/tencent/geturl?mid=' + songmid + '&quality=' + q, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.data && d.data.url) return d.data.url
      if (d && d.url) return d.url
      throw new Error('vkeys: 无数据')
    },
  },

  // === 后端7: vkeys 旧版API ===
  {
    name: 'vkeys旧版',
    fetch: async (songmid, quality) => {
      const qualityMap = { '128k': '8', '320k': '9', flac: '10', flac24bit: '16', hires: '14', atmos: '13', atmos_plus: '12', master: '11' }
      const q = qualityMap[quality]
      if (!q) throw new Error('vkeys旧版 不支持的音质')
      const res = await httpFetch('https://api.vkeys.cn/music/tencent/song/link?mid=' + songmid + '&quality=' + q, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['data', 'url'], ['url']])
      if (url) return url
      throw new Error('vkeys旧版: 无数据')
    },
  },

  // === 后端8: 柳云API（liuyunidc） ===
  {
    name: '柳云API',
    fetch: async (songmid, quality) => {
      const qualityMap = { '128k': '128k', '320k': '320k', flac: 'flac', flac24bit: 'master', hires: 'atmos', atmos: 'atmos', atmos_plus: 'atmos', master: 'master' }
      const q = qualityMap[quality] || '128k'
      // 先获取card密钥
      let card = ''
      try {
        const cardRes = await httpFetch('https://github.com/CharlesPikachu/musicdl/releases/download/keys/baimusic.txt', { method: 'GET', timeout: 5000 })
        card = String(cardRes.body || '').trim()
      } catch (e) {}
      const res = await httpFetch('https://api.liuyunidc.cn/baimusic/musicurl.php?source=tx&musicId=' + songmid + '&quality=' + q + (card ? '&card=' + encodeURIComponent(card) : ''), {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', Referer: 'http://api.liuyunidc.cn/baimusic/' },
      })
      const d = res.body
      const url = extractUrl(d, [['url'], ['data', 'url']])
      if (url) return url
      throw new Error('柳云API: 无数据')
    },
  },

  // === 后端9: 317ak API ===
  {
    name: '317ak',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': '5', '320k': '6', flac: '8', flac24bit: '7', hires: '9', atmos: '10', atmos_plus: '10', master: '10' }
      const br = brMap[quality] || '5'
      const res = await httpFetch('https://api.317ak.cn/api/yinyue/qqyinyue?ckey=ZK76QJCIH5PPICJOOXUH&i=' + songmid + '&br=' + br + '&type=json&lrc=1', {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['url'], ['data', 'url']])
      if (url) return url
      throw new Error('317ak: 无数据')
    },
  },

  // === 后端10: nki.pw API（flac用） ===
  {
    name: 'nki',
    fetch: async (songmid, quality) => {
      if (quality !== 'flac') throw new Error('nki仅支持flac')
      const apiKeys = ['28fece925439b052792a97989c870ced3803a71c6b534f71e5a5338b2d31ef8', 'c4c4f5fc36bad4cacb98839e14fea40277b35ea2eb1babdad7bbde128400f3b1']
      const errors = []
      for (const key of apiKeys) {
        try {
          const res = await httpFetch('https://api.nki.pw/API/music_open_api.php?mid=' + songmid + '&apikey=' + key, {
            method: 'GET', timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
          })
          const d = res.body
          const url = extractUrl(d, [['song_play_url_sq'], ['song_play_url_pq'], ['song_play_url_hq'], ['song_play_url'], ['song_play_url_standard']])
          if (url) return url
        } catch (e) { errors.push(e.message) }
      }
      throw new Error('nki: ' + errors.join(' | '))
    },
  },

  // === 后端11: tang.api.s01s.cn（flac用） ===
  {
    name: 'tang',
    fetch: async (songmid, quality) => {
      if (quality !== 'flac') throw new Error('tang仅支持flac')
      const res = await httpFetch('https://tang.api.s01s.cn/music_open_api.php?mid=' + songmid, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['song_play_url_sq'], ['song_play_url_pq'], ['song_play_url_hq'], ['song_play_url'], ['song_play_url_standard']])
      if (url) return url
      throw new Error('tang: 无数据')
    },
  },

  // === 后端12: 玉宁熙API ===
  {
    name: '玉宁熙',
    fetch: async (songmid, quality) => {
      const qualityMap = { '128k': '标准', '320k': 'HQ', flac: 'SQ', flac24bit: '母带', hires: '母带', atmos: '母带', master: '母带' }
      const q = qualityMap[quality] || '标准'
      const res = await httpFetch('https://api-v2.yuafeng.cn/API/qqmusic.php?type=' + encodeURIComponent(q) + '&mid=' + songmid + '&apikey=3ff23523e47465224a3f48579acf41f241540ce04b6cc0b94164f37a5b6299d5', {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.data && d.data.music) return d.data.music
      throw new Error('玉宁熙: 无数据')
    },
  },

  // === 后端13: 收集の聚合接口（cyapi） ===
  {
    name: '收集聚合',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://cyapi.top/API/qq_music.php?apikey=1ffdf5733f5d538760e63d7e46ba17438d9f7b9dfc18c51be1109386fd74c3a1&type=json&mid=' + songmid, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.url) return d.url
      throw new Error('收集聚合: 无数据')
    },
  },

  // === 后端14: 88.lxmusic（独家音源v3/v4） ===
  {
    name: 'lxmusic88',
    fetch: async (songmid, quality) => {
      try {
        const res = await httpFetch('https://88.lxmusic.xn--fiqs8s/lxmusicv4/url/tx/' + songmid + '/' + quality, {
          method: 'GET', timeout: 8000,
          headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'x-request-key': 'lxmusic' },
        })
        const d = res.body
        if (d && (d.code === 0 || d.code === 200) && d.data) return d.data
        if (d && d.url) return d.url
      } catch (e) {}
      // 降级到v3
      const res = await httpFetch('https://88.lxmusic.xn--fiqs8s/lxmusicv3/url/tx/' + songmid + '/' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.data) return d.data
      throw new Error('lxmusic88: 无数据')
    },
  },

  // === 后端15: 长青SVIP 海棠直链 ===
  {
    name: '长青直链',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('http://175.27.166.236/kgqq1/qq.php?type=mp3&id=' + songmid + '&level=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      if (d && d.url) return d.url
      throw new Error('长青直链: 无数据')
    },
  },

  // === 后端16: nxinxz 念心直链 ===
  {
    name: '念心直链',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://music.nxinxz.com/kgqq/tx.php?id=' + songmid + '&level=' + quality + '&type=mp3', {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      if (d && d.url) return d.url
      throw new Error('念心直链: 无数据')
    },
  },

  // === 后端17: 妖狐API ===
  {
    name: '妖狐',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.yaohud.cn/api/music/qq_plus?id=' + songmid + '&level=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['url'], ['data', 'url']])
      if (url) return url
      throw new Error('妖狐: 无数据')
    },
  },

  // === 后端18: GD Studio API ===
  {
    name: 'GDStudio',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': '128', '320k': '320', flac: '740', flac24bit: '999', hires: '999' }
      const br = brMap[quality] || '128'
      const res = await httpFetch('https://music-api.gdstudio.xyz/api.php?types=url&source=qq&id=' + songmid + '&br=' + br, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.url) return d.url
      throw new Error('GDStudio: 无数据')
    },
  },

  // === 后端19: ChKsZ 聚合API ===
  {
    name: 'ChKsZ',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.chksz.top/api', {
        method: 'POST', timeout: 8000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ source: 'qq', songmid, quality }),
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      throw new Error('ChKsZ: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端20: Huibq API ===
  {
    name: 'Huibq',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://lxmusicapi.onrender.com/url/tx/' + songmid + '/' + quality, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'X-Request-Key': 'share-v3' },
      })
      const d = res.body
      if (d && d.code === 0) {
        if (d.url) return d.url
        if (d.data && d.data.url) return d.data.url
      }
      throw new Error('Huibq: 无数据')
    },
  },

  // === 后端21: 聚合API（lerd.dpdns.org） ===
  {
    name: '聚合API',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.music.lerd.dpdns.org/tx', {
        method: 'POST', timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ musicInfo: { songmid }, type: quality }),
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      throw new Error('聚合API: 无数据')
    },
  },

  // === 后端22: Fish API（gdstudio POST） ===
  {
    name: 'FishAPI',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': 128, '320k': 320, flac: 740, flac24bit: 999 }
      const br = brMap[quality]
      if (!br) throw new Error('FishAPI 不支持的音质')
      const result = await fishPost({ types: 'url', id: songmid, source: 'qq', br: br }, encodeURIComponent(songmid))
      const url = result && result.url ? cleanUrl(String(result.url)) : ''
      if (url.startsWith('http')) return url
      throw new Error('FishAPI: 无数据')
    },
  },

  // === 后端23: 汽水VIP API ===
  {
    name: '汽水VIP',
    fetch: async (songmid, quality) => {
      const levelMap = { '128k': 'standard', '320k': 'exhigh', flac: 'lossless', flac24bit: 'hires' }
      const level = levelMap[quality] || 'standard'
      const res = await httpFetch('https://api.vsaa.cn/api/music.qishui.vip?act=song&id=' + songmid + '&quality=' + level, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['data', 'data', 0, 'url'], ['data', 'data', 'url'], ['data', 'url'], ['url']])
      if (url) return url
      throw new Error('汽水VIP: 无数据')
    },
  },

  // === 后端24: HYWmusic API（白姬专用，103.79.184.97） ===
  {
    name: 'HYWmusic',
    fetch: async (songmid, quality) => {
      const res = await httpFetch(HYW_API_BASE + '/api/music/url?source=tx&songId=' + songmid + '&quality=' + quality + '&key=' + HYW_CARD_KEY, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'X-Card-Key': HYW_CARD_KEY },
      })
      const d = res.body
      if (d && d.code === 200) {
        if (d.url) return d.url
        if (d.data && d.data.url) return d.data.url
      }
      throw new Error('HYWmusic: 无数据')
    },
  },
]

// ==================== 网易云音乐 后端接口列表（按优先级排列） ====================

const WY_BACKENDS = [

  // === 后端1: 网易云eapi官方接口（带Cookie可解锁VIP） ===
  {
    name: '网易云官方',
    fetch: async (songmid, quality) => {
      const level = WY_LEVEL_MAP[quality] || 'standard'
      const targetUrl = 'https://interface3.music.163.com/eapi/song/enhance/player/url/v1'
      const eapiUrl = '/api/song/enhance/player/url/v1'
      const payload = { ids: [Number(songmid)], level, encodeType: 'flac', immerseType: 'c51' }
      const encrypted = wyEapi(eapiUrl, payload)
      let cookieValue = 'os=pc; appver=; osver=; deviceId=pyncm!'
      if (HAS_WY_COOKIE) cookieValue = WY_COOKIE + '; ' + cookieValue
      const res = await httpFetch(targetUrl, {
        method: 'POST', timeout: 10000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/91.0.4472.164 NeteaseMusicDesktop/2.10.2.200154',
          Referer: 'https://music.163.com/',
          Cookie: cookieValue,
        },
        form: encrypted,
      })
      const d = res.body
      if (d && d.data && d.data[0] && d.data[0].url && !d.data[0].freeTrialInfo) return d.data[0].url
      if (d && d.data && d.data[0] && d.data[0].freeTrialInfo) throw new Error('VIP歌曲仅试听（配置Cookie后可用完整版）')
      throw new Error('网易云官方: 无数据')
    },
  },

  // === 后端2: 星海音乐源VIP接口（ChKsZ） ===
  {
    name: 'ChKsZ-VIP',
    fetch: async (songmid, quality) => {
      const level = WY_LEVEL_MAP[quality] || 'standard'
      const res = await httpFetch('https://api.chksz.top/api/163_music?id=' + songmid + '&level=' + level, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', Referer: 'https://cp.chksz.top/' },
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      throw new Error('ChKsZ-VIP: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端3: 笒鬼鬼API（cenguigui） ===
  {
    name: '笒鬼鬼',
    fetch: async (songmid, quality) => {
      const level = WY_LEVEL_MAP[quality] || 'standard'
      const res = await httpFetch('https://api.cenguigui.cn/api/netease/music_v1.php?id=' + songmid + '&type=json&level=' + level, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.data && d.data.url) return d.data.url
      if (d && d.url) return d.url
      throw new Error('笒鬼鬼: 无数据')
    },
  },

  // === 后端4: 溯音API（oiapi） ===
  {
    name: '溯音163',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://oiapi.net/api/Music_163?id=' + songmid + '&type=json', {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.url) return d.url
      if (d && d.data && d.data[0] && d.data[0].url) return d.data[0].url
      if (d && d.data && d.data.url) return d.data.url
      throw new Error('溯音163: 无数据')
    },
  },

  // === 后端5: wyapi.toubiec.cn（洛雪音乐源用） ===
  {
    name: 'toubiec',
    fetch: async (songmid, quality) => {
      const level = WY_LEVEL_MAP[quality] || 'standard'
      const res = await httpFetch('https://wyapi.toubiec.cn/api/music/url', {
        method: 'POST', timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
          Origin: 'https://wyapi.toubiec.cn',
          Referer: 'https://wyapi.toubiec.cn/',
        },
        body: JSON.stringify({ id: songmid, level }),
      })
      const d = res.body
      if (d && d.data && d.data[0] && d.data[0].url) return d.data[0].url
      if (d && d.url) return d.url
      throw new Error('toubiec: 无数据')
    },
  },

  // === 后端6: GD Studio API ===
  {
    name: 'GDStudio',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': '128', '320k': '320', flac: '740', flac24bit: '999', hires: '999' }
      const br = brMap[quality] || '128'
      const res = await httpFetch('https://music-api.gdstudio.xyz/api.php?use_xbridge3=true&loader_name=forest&need_sec_link=1&sec_link_scene=im&theme=light&types=url&source=netease&id=' + songmid + '&br=' + br, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.url) return d.url
      throw new Error('GDStudio: 无数据')
    },
  },

  // === 后端7: 星海音乐源主后端（yy.zddyr.top） ===
  {
    name: '星海主后端',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://yy.zddyr.top/lx/api/?source=netease&songmid=' + songmid + '&quality=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      throw new Error('星海主后端: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端8: 星海音乐源备用后端（zrcdy） ===
  {
    name: '星海备后端',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://zrcdy.dpdns.org/lx/api/api.php?source=netease&songmid=' + songmid + '&quality=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      throw new Error('星海备后端: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端9: api.bugpk.com（多平台聚合音源） ===
  {
    name: 'bugpk',
    fetch: async (songmid, quality) => {
      const level = WY_LEVEL_MAP[quality] || 'standard'
      const res = await httpFetch('https://api.bugpk.com/api/163_music?type=json&ids=' + songmid + '&level=' + level, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['url'], ['data', 'url'], ['data', 0, 'url']])
      if (url) return url
      throw new Error('bugpk: 无数据')
    },
  },

  // === 后端10: nxinxz 念心直链 ===
  {
    name: '念心直链',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('http://music.nxinxz.com/wy.php?id=' + songmid + '&level=' + quality + '&type=mp3', {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      if (d && d.url) return d.url
      throw new Error('念心直链: 无数据')
    },
  },

  // === 后端11: 长青SVIP 直链 ===
  {
    name: '长青直链',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('http://175.27.166.236/wy1/wy.php?type=mp3&id=' + songmid + '&level=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      if (d && d.url) return d.url
      throw new Error('长青直链: 无数据')
    },
  },

  // === 后端12: 妖狐API ===
  {
    name: '妖狐',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.yaohud.cn/api/music/wyvip?id=' + songmid + '&level=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['url'], ['data', 'url']])
      if (url) return url
      throw new Error('妖狐: 无数据')
    },
  },

  // === 后端13: 88.lxmusic（独家音源v4） ===
  {
    name: 'lxmusic88',
    fetch: async (songmid, quality) => {
      const level = WY_LEVEL_MAP[quality] || 'standard'
      const res = await httpFetch('https://88.lxmusic.xn--fiqs8s/lxmusicv4/url/wy/' + songmid + '/' + level, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'x-request-key': 'lxmusic' },
      })
      const d = res.body
      if (d && (d.code === 0 || d.code === 200)) {
        if (d.data) return d.data
        if (d.url) return d.url
      }
      throw new Error('lxmusic88: 无数据')
    },
  },

  // === 后端14: Fish API（gdstudio POST） ===
  {
    name: 'FishAPI',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': 128, '320k': 320, flac: 740, flac24bit: 999 }
      const br = brMap[quality]
      if (!br) throw new Error('FishAPI 不支持的音质')
      const result = await fishPost({ types: 'url', id: songmid, source: 'netease', br: br }, encodeURIComponent(songmid))
      const url = result && result.url ? cleanUrl(String(result.url)) : ''
      if (url.startsWith('http')) return url
      throw new Error('FishAPI: 无数据')
    },
  },

  // === 后端15: Huibq API ===
  {
    name: 'Huibq',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://lxmusicapi.onrender.com/url/wy/' + songmid + '/' + quality, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'X-Request-Key': 'share-v3' },
      })
      const d = res.body
      if (d && d.code === 0) {
        if (d.url) return d.url
        if (d.data && d.data.url) return d.data.url
      }
      throw new Error('Huibq: 无数据')
    },
  },

  // === 后端16: 聚合API（lerd.dpdns.org） ===
  {
    name: '聚合API',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.music.lerd.dpdns.org/wy', {
        method: 'POST', timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ musicInfo: { songmid }, type: quality }),
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      throw new Error('聚合API: 无数据')
    },
  },

  // === 后端17: 汽水VIP API ===
  {
    name: '汽水VIP',
    fetch: async (songmid, quality) => {
      const levelMap = { '128k': 'standard', '320k': 'exhigh', flac: 'lossless', flac24bit: 'hires' }
      const level = levelMap[quality] || 'standard'
      const res = await httpFetch('https://api.vsaa.cn/api/music.qishui.vip?act=song&id=' + songmid + '&quality=' + level, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['data', 'data', 0, 'url'], ['data', 'data', 'url'], ['data', 'url'], ['url']])
      if (url) return url
      throw new Error('汽水VIP: 无数据')
    },
  },

  // === 后端18: HYWmusic API（白姬专用，103.79.184.97） ===
  {
    name: 'HYWmusic',
    fetch: async (songmid, quality) => {
      const res = await httpFetch(HYW_API_BASE + '/api/music/url?source=wy&songId=' + songmid + '&quality=' + quality + '&key=' + HYW_CARD_KEY, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'X-Card-Key': HYW_CARD_KEY },
      })
      const d = res.body
      if (d && d.code === 200) {
        if (d.url) return d.url
        if (d.data && d.data.url) return d.data.url
      }
      throw new Error('HYWmusic: 无数据')
    },
  },
]

// ==================== 酷我音乐(kw) 后端接口列表（按优先级排列） ====================

const KW_BACKENDS = [

  // === 后端1: 酷我流媒体直链（175.27.166.236:8928，返回二进制音频流，取自酷我流媒体音源） ===
  // 注：该服务器atmos/atmos_plus/master返回200，其他音质返回400，但URL本身即为可播放地址，无需验证
  {
    name: '酷我流媒体',
    fetch: async (songmid, quality, musicInfo) => {
      const level = KW_STREAM_LEVEL_MAP[quality] || 'master'
      const songIdTmp = musicInfo?.songmid || musicInfo?.id || musicInfo?.hash || musicInfo?.songId || musicInfo?.musicId || songmid
      if (!songIdTmp) throw new Error('酷我流媒体: 找不到歌曲ID')
      const songId = String(songIdTmp).trim()
      // 该URL返回二进制音频流，URL本身即为可播放地址，直接返回无需验证
      return 'http://175.27.166.236:8928/kwstream?id=' + encodeURIComponent(songId) + '&level=' + level + '&stream=1'
    },
  },

  // === 后端2: 星海音乐源主后端（yy.zddyr.top，带完整歌曲信息） ===
  {
    name: '星海主后端',
    fetch: async (songmid, quality, musicInfo) => {
      const name = musicInfo?.name || ''
      const singer = musicInfo?.singer || ''
      const interval = musicInfo?.interval || ''
      const albumName = musicInfo?.albumName || musicInfo?.album || ''
      const res = await httpFetch('https://yy.zddyr.top/lx/api/?source=kw&name=' + encodeURIComponent(name) + '&singer=' + encodeURIComponent(singer) + '&songmid=' + encodeURIComponent(songmid) + '&interval=' + encodeURIComponent(interval) + '&albumName=' + encodeURIComponent(albumName) + '&quality=' + quality, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      throw new Error('星海主后端: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端2: 星海音乐源备用后端（zrcdy，带完整歌曲信息） ===
  {
    name: '星海备后端',
    fetch: async (songmid, quality, musicInfo) => {
      const name = musicInfo?.name || ''
      const singer = musicInfo?.singer || ''
      const interval = musicInfo?.interval || ''
      const albumName = musicInfo?.albumName || musicInfo?.album || ''
      const res = await httpFetch('https://zrcdy.dpdns.org/lx/api/api.php?source=kw&name=' + encodeURIComponent(name) + '&singer=' + encodeURIComponent(singer) + '&songmid=' + encodeURIComponent(songmid) + '&interval=' + encodeURIComponent(interval) + '&albumName=' + encodeURIComponent(albumName) + '&quality=' + quality, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      throw new Error('星海备后端: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端3: 笒鬼鬼API（cenguigui） ===
  {
    name: '笒鬼鬼',
    fetch: async (songmid, quality) => {
      const level = KW_LEVEL_MAP[quality] || '128k'
      const res = await httpFetch('https://api.cenguigui.cn/api/kuwo/music_v1.php?id=' + songmid + '&type=song&format=json&level=' + level, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['data', 'url'], ['url']])
      if (url) return url
      throw new Error('笒鬼鬼: 无数据')
    },
  },

  // === 后端4: 聚合API（lerd.dpdns.org） ===
  {
    name: '聚合API',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.music.lerd.dpdns.org/kw', {
        method: 'POST', timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ musicInfo: { songmid }, type: quality }),
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      throw new Error('聚合API: 无数据')
    },
  },

  // === 后端5: 妖狐API ===
  {
    name: '妖狐',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.yaohud.cn/api/music/kwvip?id=' + songmid + '&level=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['url'], ['data', 'url']])
      if (url) return url
      throw new Error('妖狐: 无数据')
    },
  },

  // === 后端6: 长青直链 ===
  {
    name: '长青直链',
    fetch: async (songmid, quality) => {
      const level = qualityToLevel(quality)
      const res = await httpFetch('http://175.27.166.236/kgqq1/kw.php?type=mp3&id=' + songmid + '&level=' + level, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      if (d && d.url) return d.url
      throw new Error('长青直链: 无数据')
    },
  },

  // === 后端7: 念心直链 ===
  {
    name: '念心直链',
    fetch: async (songmid, quality) => {
      const level = qualityToLevel(quality)
      const res = await httpFetch('https://music.nxinxz.com/kgqq/kw.php?id=' + songmid + '&level=' + level + '&type=mp3', {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      if (d && d.url) return d.url
      throw new Error('念心直链: 无数据')
    },
  },

  // === 后端8: 酷我官方接口（KuwoDES格式，surl=1） ===
  {
    name: '酷我官方',
    fetch: async (songmid, quality, musicInfo) => {
      const brMap = { '128k': '128kmp3', '192k': '128kmp3', '320k': '320kmp3', flac: '2000kflac', flac24bit: '4000kflac' }
      const br = brMap[quality]
      if (!br) throw new Error('酷我官方 不支持的音质')
      let rid = musicInfo?.rid || ''
      if (!rid && musicInfo?.musicrid) rid = String(musicInfo.musicrid).replace(/^MUSIC_/, '')
      if (!rid) rid = songmid
      // 使用KuwoDES格式，surl=1让服务器返回surl字段
      const res = await httpFetch('https://mobi.kuwo.cn/mobi.s?f=web&rid=' + rid + '&br=' + br + '&source=jiakong&type=convert_url_with_sign&surl=1', {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36' },
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.surl) return d.data.surl
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      throw new Error('酷我官方: 无数据')
    },
  },

  // === 后端9: 酷我手机版（不同source标识） ===
  {
    name: '酷我手机版',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': '128kmp3', '192k': '128kmp3', '320k': '320kmp3', flac: '2000kflac', flac24bit: '4000kflac' }
      const br = brMap[quality]
      if (!br) throw new Error('酷我手机版 不支持的音质')
      const res = await httpFetch('https://nmobi.kuwo.cn/mobi.s?f=web&user=0&source=kwplayerhd_ar_4.3.0.8_tianbao_T1A_qirui.apk&type=convert_url_with_sign&rid=' + songmid + '&br=' + br, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36' },
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      if (d && d.code === 200 && d.data && d.data.surl) return d.data.surl
      throw new Error('酷我手机版: 无数据')
    },
  },

  // === 后端10: 酷我车机版（不同source标识） ===
  {
    name: '酷我车机版',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': '128kmp3', '192k': '128kmp3', '320k': '320kmp3', flac: '2000kflac', flac24bit: '4000kflac' }
      const br = brMap[quality]
      if (!br) throw new Error('酷我车机版 不支持的音质')
      const res = await httpFetch('https://mobi.kuwo.cn/mobi.s?f=web&user=0&source=kwplayercar_ar_6.0.0.9_B_jiakong_vh.apk&type=convert_url_with_sign&br=' + br + '&sig=0&rid=' + songmid, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36' },
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      if (d && d.code === 200 && d.data && d.data.surl) return d.data.surl
      throw new Error('酷我车机版: 无数据')
    },
  },

  // === 后端11: 聆澜API ===
  {
    name: '聆澜',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://source.shiqianjiang.cn/api/music/url?source=kw&songId=' + songmid + '&quality=' + quality, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      if (d && d.data && d.data.url) return d.data.url
      throw new Error('聆澜: 无数据')
    },
  },

  // === 后端12: HYWmusic API（白姬专用，103.79.184.97） ===
  {
    name: 'HYWmusic',
    fetch: async (songmid, quality) => {
      const res = await httpFetch(HYW_API_BASE + '/api/music/url?source=kw&songId=' + songmid + '&quality=' + quality + '&key=' + HYW_CARD_KEY, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'X-Card-Key': HYW_CARD_KEY },
      })
      const d = res.body
      if (d && d.code === 200) {
        if (d.url) return d.url
        if (d.data && d.data.url) return d.data.url
      }
      throw new Error('HYWmusic: 无数据')
    },
  },

  // === 后端13: 溯音酷我（oiapi.net，搜索式API，不依赖songmid） ===
  {
    name: '溯音酷我',
    fetch: async (songmid, quality, musicInfo) => {
      const brMap = { '128k': '7', '192k': '5', '320k': '5', flac: '1', flac24bit: '1' }
      const br = brMap[quality] || '7'
      const name = musicInfo?.name || ''
      const singer = musicInfo?.singer || ''
      const keyword = name + (singer ? ' ' + singer : '')
      if (!keyword) throw new Error('溯音酷我: 缺少歌曲名')
      const res = await httpFetch('https://oiapi.net/api/Kuwo?msg=' + encodeURIComponent(keyword) + '&n=1&br=' + br, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.data && d.data.url) return d.data.url
      if (d && d.url) return d.url
      throw new Error('溯音酷我: 无数据')
    },
  },

  // === 后端14: Hello World KW API（lxmusic.xn--fiqs8s，带SHA256签名） ===
  {
    name: 'HelloWorld',
    fetch: async (songmid, quality, musicInfo) => {
      const songId = musicInfo?.rid || musicInfo?.hash || musicInfo?.songmid || musicInfo?.id || songmid
      if (!songId) throw new Error('HelloWorld: 找不到歌曲ID')
      const requestPath = '/lxmusicv4/url/kw/' + songId + '/' + quality
      const sign = helloWorldSign(requestPath)
      const url = HELLO_WORLD_API_URL + requestPath + '?sign=' + sign
      const res = await httpFetch(url, {
        method: 'GET', timeout: 10000,
        headers: {
          'accept': 'application/json',
          'x-request-key': HELLO_WORLD_API_KEY,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })
      const d = res.body
      if (d && (d.code === 0 || d.code === 200)) {
        const musicUrl = d.data || d.url
        if (musicUrl) return musicUrl
      }
      throw new Error('HelloWorld: ' + (d?.msg || '无数据'))
    },
  },
]

// ==================== 酷狗音乐(kg) 后端接口列表（按优先级排列） ====================

const KG_BACKENDS = [

  // === 后端1: 长青海棠主后端（musicserver.haitangw.cc，取自长青SVIP音源二改版主API） ===
  {
    name: '长青海棠',
    fetch: async (songmid, quality, musicInfo) => {
      const level = KG_LEVEL_MAP[quality] || 'standard'
      const hash = musicInfo?.hash || musicInfo?.songmid || songmid
      const res = await httpFetch('https://musicserver.haitangw.cc/v1/music/resolve-url', {
        method: 'POST', timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ source: 'kg', rid: hash, level: level }),
      })
      const d = res.body
      // 响应格式: {code: 0, data: {url: "..."}}
      if (d && d.code === 0 && d.data && d.data.url) return d.data.url
      throw new Error('长青海棠: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端2: 长青SVIP直链（取自Hei Music，直接构造URL，不发起HTTP请求） ===
  {
    name: '长青SVIP直链',
    fetch: async (songmid, quality, musicInfo) => {
      const level = KG_LEVEL_MAP[quality] || 'standard'
      const hash = musicInfo?.hash || musicInfo?.songmid || songmid
      // 直接构造URL，该URL本身即为有效直链
      const url = 'https://music.haitangw.cc/kgqq1/kg.php?type=mp3&id=' + hash + '&level=' + level
      const res = await httpFetch(url, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      if (d && d.url) return d.url
      throw new Error('长青SVIP直链: 无数据')
    },
  },

  // === 后端3: 长青直链（175.27.166.236，备用） ===
  {
    name: '长青直链',
    fetch: async (songmid, quality, musicInfo) => {
      const level = KG_LEVEL_MAP[quality] || 'standard'
      const hash = musicInfo?.hash || songmid
      const res = await httpFetch('http://175.27.166.236/kgqq1/kg.php?type=mp3&id=' + hash + '&level=' + level, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      if (d && d.url) return d.url
      throw new Error('长青直链: 无数据')
    },
  },

  // === 后端4: 长青POST（175.27.166.236 POST接口） ===
  {
    name: '长青POST',
    fetch: async (songmid, quality, musicInfo) => {
      const level = KG_LEVEL_MAP[quality] || 'standard'
      const hash = musicInfo?.hash || songmid
      const res = await httpFetch('http://175.27.166.236/kgqq1/kg.php', {
        method: 'POST', timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ source: 'kg', id: hash, level: level }),
      })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      if (d && d.url) return d.url
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      throw new Error('长青POST: 无数据')
    },
  },

  // === 后端5: 星海音乐源主后端（yy.zddyr.top） ===
  {
    name: '星海主后端',
    fetch: async (songmid, quality, musicInfo) => {
      const hash = musicInfo?.hash || (musicInfo?._types?.[quality]?.hash) || songmid
      const albumId = musicInfo?.albumId || ''
      const mainHash = hash
      const res = await httpFetch('https://yy.zddyr.top/lx/api/?source=kg&quality=' + quality + '&songmid=' + (musicInfo?.songmid || songmid) + '&albumId=' + albumId + '&mainHash=' + mainHash + '&hash=' + hash, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      throw new Error('星海主后端: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端6: 星海音乐源备用后端（zrcdy） ===
  {
    name: '星海备后端',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://zrcdy.dpdns.org/lx/api/api.php?source=kg&songmid=' + songmid + '&quality=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      throw new Error('星海备后端: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端7: 聚合API（lerd.dpdns.org） ===
  {
    name: '聚合API',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.music.lerd.dpdns.org/kg', {
        method: 'POST', timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ musicInfo: { songmid }, type: quality }),
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      throw new Error('聚合API: 无数据')
    },
  },

  // === 后端8: Hello World KG API（lxmusic.xn--fiqs8s，带SHA256签名） ===
  {
    name: 'HelloWorld',
    fetch: async (songmid, quality, musicInfo) => {
      const songId = musicInfo?.hash || musicInfo?.songmid || musicInfo?.id || songmid
      if (!songId) throw new Error('HelloWorld: 找不到歌曲ID')
      const requestPath = '/lxmusicv4/url/kg/' + songId + '/' + quality
      const sign = helloWorldSign(requestPath)
      const url = HELLO_WORLD_API_URL + requestPath + '?sign=' + sign
      const res = await httpFetch(url, {
        method: 'GET', timeout: 10000,
        headers: {
          'accept': 'application/json',
          'x-request-key': HELLO_WORLD_API_KEY,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })
      const d = res.body
      if (d && (d.code === 0 || d.code === 200)) {
        const musicUrl = d.data || d.url
        if (musicUrl) return musicUrl
      }
      throw new Error('HelloWorld: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端9: 妖狐API ===
  {
    name: '妖狐',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.yaohud.cn/api/music/kgvip?id=' + songmid + '&level=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['url'], ['data', 'url']])
      if (url) return url
      throw new Error('妖狐: 无数据')
    },
  },

  // === 后端10: 念心KG ===
  {
    name: '念心KG',
    fetch: async (songmid, quality) => {
      const level = KG_LEVEL_MAP[quality] || 'standard'
      const res = await httpFetch('https://music.nxinxz.com/kgqq/kg.php?id=' + songmid + '&level=' + level + '&type=mp3', {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      throw new Error('念心KG: 无数据')
    },
  },

  // === 后端11: ChKsZ 聚合API ===
  {
    name: 'ChKsZ',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.chksz.top/api', {
        method: 'POST', timeout: 8000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ source: 'kg', songmid, quality }),
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      throw new Error('ChKsZ: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端12: 海棠API（使用KG_LEVEL_MAP修正master音质） ===
  {
    name: '海棠API',
    fetch: async (songmid, quality, musicInfo) => {
      const level = KG_LEVEL_MAP[quality] || 'standard'
      const hash = musicInfo?.hash || (musicInfo?._types?.[quality]?.hash) || songmid
      const res = await httpFetch('https://musicapi.haitangw.net/kgqq/kg.php?type=json&id=' + hash + '&level=' + level, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      const url = extractUrl(d, [['url'], ['data', 'url']])
      if (url) return url
      throw new Error('海棠API: 无数据')
    },
  },

  // === 后端13: 酷狗官方API（直接调用酷狗官方接口） ===
  {
    name: '酷狗官方',
    fetch: async (songmid, quality, musicInfo) => {
      const hash = musicInfo?.hash || songmid
      const albumId = musicInfo?.albumId || ''
      const res = await httpFetch('https://wwwapi.kugou.com/yy/index.php?r=play/getdata&hash=' + hash + '&platid=4&album_id=' + albumId + '&mid=00000000000000000000000000000000', {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.kugou.com/' },
      })
      const d = res.body
      if (d && d.status === 1 && d.data && d.data.play_backup_url) return d.data.play_backup_url
      if (d && d.status === 1 && d.data && d.data.play_url) return d.data.play_url
      throw new Error('酷狗官方: 无数据')
    },
  },

  // === 后端14: 聆澜API ===
  {
    name: '聆澜',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://source.shiqianjiang.cn/api/music/url?source=kg&songId=' + songmid + '&quality=' + quality, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      if (d && d.data && d.data.url) return d.data.url
      throw new Error('聆澜: 无数据')
    },
  },

  // === 后端15: HYWmusic API（白姬专用，103.79.184.97） ===
  {
    name: 'HYWmusic',
    fetch: async (songmid, quality) => {
      const res = await httpFetch(HYW_API_BASE + '/api/music/url?source=kg&songId=' + songmid + '&quality=' + quality + '&key=' + HYW_CARD_KEY, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'X-Card-Key': HYW_CARD_KEY },
      })
      const d = res.body
      if (d && d.code === 200) {
        if (d.url) return d.url
        if (d.data && d.data.url) return d.data.url
      }
      throw new Error('HYWmusic: 无数据')
    },
  },

  // === 后端16: GD Studio API ===
  {
    name: 'GDStudio',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': '128', '320k': '320', flac: '740', flac24bit: '999', hires: '999' }
      const br = brMap[quality] || '128'
      const res = await httpFetch('https://music-api.gdstudio.xyz/api.php?types=url&source=kg&id=' + songmid + '&br=' + br, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.url) return d.url
      throw new Error('GDStudio: 无数据')
    },
  },
]

// ==================== 咪咕音乐(mg) 后端接口列表（按优先级排列） ====================

const MG_BACKENDS = [

  // === 后端1: 星海音乐源主后端（yy.zddyr.top） ===
  {
    name: '星海主后端',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://yy.zddyr.top/lx/api/?source=migu&songmid=' + songmid + '&quality=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      throw new Error('星海主后端: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端2: 星海音乐源备用后端（zrcdy） ===
  {
    name: '星海备后端',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://zrcdy.dpdns.org/lx/api/api.php?source=migu&songmid=' + songmid + '&quality=' + quality, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      throw new Error('星海备后端: ' + (d?.msg || '无数据'))
    },
  },

  // === 后端3: 聚合API（lerd.dpdns.org） ===
  {
    name: '聚合API',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://api.music.lerd.dpdns.org/mg', {
        method: 'POST', timeout: 10000,
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
        body: JSON.stringify({ musicInfo: { songmid }, type: quality }),
      })
      const d = res.body
      if (d && d.code === 200 && d.data && d.data.url) return d.data.url
      throw new Error('聚合API: 无数据')
    },
  },

  // === 后端4: GD Studio API ===
  {
    name: 'GDStudio',
    fetch: async (songmid, quality) => {
      const brMap = { '128k': '128', '320k': '320', flac: '1000' }
      const br = brMap[quality] || '128'
      const res = await httpFetch('https://music-api.gdstudio.xyz/api.php?types=url&source=migu&id=' + songmid + '&br=' + br, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.url) return d.url
      throw new Error('GDStudio: 无数据')
    },
  },

  // === 后端5: Migu直接源（Hei Music） ===
  {
    name: 'Migu直接源',
    fetch: async (songmid, quality) => {
      const level = qualityToLevel(quality)
      const res = await httpFetch('https://music.migu.cn/v3/api/music/audioPlayer/getPlayInfo?copyrightId=' + encodeURIComponent(String(songmid)) + '&level=' + level, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', Referer: 'https://music.migu.cn/' },
      })
      const d = res.body
      if (d && d.data && d.data.playUrl) return d.data.playUrl
      if (d && d.url) return d.url
      if (d && d.playUrl) return d.playUrl
      throw new Error('Migu直接源: 无数据')
    },
  },

  // === 后端6: Migu API（Hei Music） ===
  {
    name: 'Migu API',
    fetch: async (songmid, quality) => {
      const levelMap = { '128k': 'PQ', '320k': 'HQ', flac: 'SQ', flac24bit: 'ZQ' }
      const level = levelMap[quality] || 'HQ'
      const res = await httpFetch('https://app.c.nf.migu.cn/MIGUM2.0/strategy/listen-url/v2.2?copyrightId=' + encodeURIComponent(String(songmid)) + '&quality=' + level, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36', Referer: 'https://app.c.nf.migu.cn/' },
      })
      const d = res.body
      if (d && d.data && d.data.url) return d.data.url
      if (d && d.url) return d.url
      if (d && d.data && d.data.playUrl) return d.data.playUrl
      throw new Error('Migu API: 无数据')
    },
  },

  // === 后端7: 星海后端（Hei Music xhbackend） ===
  {
    name: '星海后端',
    fetch: async (songmid, quality) => {
      const level = qualityToLevel(quality)
      const res = await httpFetch('https://api.xinghai-backend.cn/migu?id=' + encodeURIComponent(String(songmid)) + '&quality=' + level, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      if (d && d.data && d.data.url) return d.data.url
      throw new Error('星海后端: 无数据')
    },
  },

  // === 后端8: 长青直链（haitangw） ===
  {
    name: '长青直链',
    fetch: async (songmid, quality) => {
      const level = qualityToLevel(quality)
      const res = await httpFetch('https://music.haitangw.cc/musicapi/mg.php?type=mp3&id=' + encodeURIComponent(String(songmid)) + '&level=' + level, {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      if (d && d.url) return d.url
      throw new Error('长青直链: 无数据')
    },
  },

  // === 后端9: 念心直链 ===
  {
    name: '念心直链',
    fetch: async (songmid, quality) => {
      const level = qualityToLevel(quality)
      const res = await httpFetch('http://music.nxinxz.com/mg.php?id=' + encodeURIComponent(String(songmid)) + '&level=' + level + '&type=mp3', {
        method: 'GET', timeout: 8000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
      })
      const d = res.body
      if (typeof d === 'string' && (d.startsWith('http://') || d.startsWith('https://'))) return d
      if (d && d.url) return d.url
      throw new Error('念心直链: 无数据')
    },
  },

  // === 后端10: 聆澜API ===
  {
    name: '聆澜',
    fetch: async (songmid, quality) => {
      const res = await httpFetch('https://source.shiqianjiang.cn/api/music/url?source=mg&songId=' + songmid + '&quality=' + quality, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      })
      const d = res.body
      if (d && d.code === 200 && d.url) return d.url
      if (d && d.data && d.data.url) return d.data.url
      throw new Error('聆澜: 无数据')
    },
  },

  // === 后端11: HYWmusic API（白姬专用，103.79.184.97） ===
  {
    name: 'HYWmusic',
    fetch: async (songmid, quality) => {
      const res = await httpFetch(HYW_API_BASE + '/api/music/url?source=mg&songId=' + songmid + '&quality=' + quality + '&key=' + HYW_CARD_KEY, {
        method: 'GET', timeout: 10000,
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json', 'X-Card-Key': HYW_CARD_KEY },
      })
      const d = res.body
      if (d && d.code === 200) {
        if (d.url) return d.url
        if (d.data && d.data.url) return d.data.url
      }
      throw new Error('HYWmusic: 无数据')
    },
  },
]

// ==================== 获取音乐URL（带多后端轮询） ====================

const handleGetMusicUrl = async (source, musicInfo, quality) => {
  const songId = musicInfo.hash ?? musicInfo.songmid ?? musicInfo.id
  if (!songId) throw new Error('无法获取歌曲ID')

  let backends = {
    tx: TX_BACKENDS,
    wy: WY_BACKENDS,
    kw: KW_BACKENDS,
    kg: KG_BACKENDS,
    mg: MG_BACKENDS,
  }[source]

  if (!backends) throw new Error('未知音源: ' + source)

  // 酷我音乐：高音质（atmos/atmos_plus/master）走流媒体直链，普通音质走星海等其他后端
  if (source === 'kw') {
    const highQuality = ['atmos', 'atmos_plus', 'master']
    if (highQuality.includes(quality)) {
      // 高音质只走酷我流媒体（后端1），不做降级
      backends = [backends[0]]
    } else {
      // 普通音质跳过酷我流媒体（后端1），从星海主后端（后端2）开始
      backends = backends.slice(1)
    }
  }

  const errors = []

  for (const backend of backends) {
    try {
      console.log('[' + source + '] 尝试后端: ' + backend.name + ' ID: ' + songId + ' 音质: ' + quality)
      const url = await backend.fetch(songId, quality, musicInfo)
      if (url) {
        console.log('[' + source + '] ' + backend.name + ' 成功')
        return url
      }
    } catch (e) {
      errors.push(backend.name + ': ' + e.message)
      console.log('[' + source + '] ' + backend.name + ' 失败: ' + e.message)
    }
  }

  throw new Error('所有后端均失败（共' + backends.length + '个）\\n' + errors.join('\\n'))
}

// ==================== 注册请求事件 ====================

on(EVENT_NAMES.request, ({ action, source, info }) => {
  switch (action) {
    case 'musicUrl':
      return handleGetMusicUrl(source, info.musicInfo, info.type)
        .then((data) => Promise.resolve(data))
        .catch((err) => Promise.reject(err))
    default:
      return Promise.reject('action not support: ' + action)
  }
})

// ==================== 初始化音源 ====================

const musicSources = {}
MUSIC_SOURCE.forEach((item) => {
  const nameMap = {
    tx: 'QQ音乐',
    wy: '网易云音乐',
    kw: '酷我音乐',
    kg: '酷狗音乐',
    mg: '咪咕音乐',
  }
  musicSources[item] = {
    name: nameMap[item] || item,
    type: 'music',
    actions: ['musicUrl'],
    qualitys: MUSIC_QUALITY[item],
  }
})

send(EVENT_NAMES.inited, {
  status: true,
  openDevTools: false,
  sources: musicSources,
})

console.log('[QQ音乐+网易云音乐+酷我+酷狗+咪咕聚合音源 v4.3.0] 已加载完成')
console.log('[QQ音乐] 后端数: ' + TX_BACKENDS.length + ' Cookie: ' + (HAS_TX_COOKIE ? '已配置' : '未配置'))
console.log('[网易云音乐] 后端数: ' + WY_BACKENDS.length + ' Cookie: ' + (HAS_WY_COOKIE ? '已配置' : '未配置'))
console.log('[酷我音乐] 后端数: ' + KW_BACKENDS.length)
console.log('[酷狗音乐] 后端数: ' + KG_BACKENDS.length + ' 主API: 长青海棠')
console.log('[咪咕音乐] 后端数: ' + MG_BACKENDS.length)`},{file:"星海音乐源 v2.3.11.js",script:`/*!
 * @name 星海音乐源
 * @description GDAPI | 聚合 | ChKSz API | 全平台支持24FLAC，网易、酷狗、QQ最高支持母带
 * @version v3.2.11
 * @Update  小优化：修复GD接口URL拼接错误；适配后端；优化初始化速度
 * @author 万去了了
 * @homepage https://zrcdy.dpdns.org/
 * @lastUpdate 2026-08-06
 * @md5 
 */

const { EVENT_NAMES, request, on, send, env } = globalThis.lx;
const URL_CONFIG = {
    domains: {
        primary: 'yy.zddyr.top',
        fallback: 'zrcdy.dpdns.org',
        gdStudio: 'music-api.gdstudio.xyz',
        vip: 'api.chksz.top'
    },
    paths: {
        backend: '/lx/api/',
        version: '/lx/versionh2.php',
        update: '/lx/vers.php',
        ip: '/ip.php',
        gdApi: '/api.php',
        vipApi: '/api/163_music'
    },
    gdParams: 'use_xbridge3=true&loader_name=forest&need_sec_link=1&sec_link_scene=im&theme=light'
};

const buildUrl = (domainKey, pathKey, extraQuery = '') => {
    const domain = URL_CONFIG.domains[domainKey];
    const path = URL_CONFIG.paths[pathKey];
    if (!domain || !path) throw new Error(\`URL配置错误: \${domainKey} / \${pathKey}\`);
    let url = \`https://\${domain}\${path}\`;
    if (extraQuery) {
        if (extraQuery.startsWith('&') && !path.includes('?')) {
            url += '?' + extraQuery.substring(1);
        } else {
            url += extraQuery;
        }
    }
    return url;
};

const SCRIPT_VERSION = 'v3.2.11';
const SCRIPT_NAME = 'XingHaiMusicSource';
const SOURCE_MAP = { tx: 'qq', mg: 'migu', kw: 'kw', kg: 'kg' };
const PLATFORM_NAMES = { wy: '网易云音乐', tx: 'QQ音乐', kw: '酷我音乐', kg: '酷狗音乐', mg: '咪咕音乐' };
const MUSIC_QUALITIES = {
    wy: ['128k','192k','320k','flac','flac24bit','hires','jyeffect','sky','jymaster'],
    tx: ['128k','192k','320k','flac','hires','atmos','atmos_plus','master'],
    kw: ['128k','192k','320k','flac','flac24bit'],
    kg: ['128k','320k','flac','hires','atmos','master'],
    mg: ['128k','320k','flac']
};
const NETEASE_VIP_LEVEL_MAP = { flac: 'lossless', flac24bit: 'hires', hires: 'hires', jyeffect: 'jyeffect', sky: 'sky', jymaster: 'jymaster' };
const NETEASE_VIP_QUALITY_SET = new Set(Object.keys(NETEASE_VIP_LEVEL_MAP));

let userIp = null;
let userToken = '';
let clientHeader = '';
let deviceId = '';
let availablePlatforms = [];
const extraCache = new Map();

// -------------------- 工具函数 --------------------
function isBuffer(obj) {
    return obj && typeof obj === 'object' &&
        ((typeof Buffer !== 'undefined' && Buffer.isBuffer(obj)) ||
        (typeof obj.constructor === 'function' && obj.constructor.name === 'Buffer'));
}

function safeParseBody(body) {
    if (typeof body === 'string') {
        const trimmed = body.trim();
        if (/^[{["]/.test(trimmed)) { try { return JSON.parse(trimmed); } catch (e) {} }
        return body;
    }
    if (typeof body === 'object' && body !== null) {
        try { if (typeof body.toString === 'function' && body.toString() !== '[object Object]') body = body.toString('utf-8'); } catch (e) {}
        if (typeof body === 'object' && !isBuffer(body)) return body;
    }
    try {
        if (isBuffer(body)) {
            if (globalThis.lx?.utils?.buffer?.bufToString) body = globalThis.lx.utils.buffer.bufToString(body, 'utf-8');
            else if (typeof Buffer !== 'undefined') body = Buffer.from(body).toString('utf-8');
            else body = String(body);
        }
    } catch (e) {}
    if (typeof body === 'string') {
        const trimmed = body.trim();
        if (/^[{["]/.test(trimmed)) { try { return JSON.parse(trimmed); } catch (e) {} }
    }
    return body;
}

function safeBase64Encode(str) {
    try {
        if (globalThis.lx?.utils?.buffer?.from) {
            const buf = globalThis.lx.utils.buffer.from(str, 'utf-8');
            return globalThis.lx.utils.buffer.bufToString(buf, 'base64');
        }
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(str, 'utf-8').toString('base64');
        }
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        return str;
    }
}

function generateDeviceId() {
    const prefix = 'lx-online-';
    const randomChars = Math.random().toString(36).substring(2, 8);
    const timestampPart = Date.now().toString(36).slice(-4);
    return prefix + randomChars + timestampPart;
}

function buildClientHeader() {
    let deviceType = 'unknown';
    try {
        const p = (env?.platform || '').toLowerCase();
        if (p.includes('android')) deviceType = 'Android';
        else if (p.includes('ios')) deviceType = 'iOS';
        else if (p.includes('win')) deviceType = 'Windows';
        else if (p.includes('mac')) deviceType = 'macOS';
        else if (p.includes('linux')) deviceType = 'Linux';
    } catch (e) {}
    return \`\${SCRIPT_NAME}/\${SCRIPT_VERSION} (\${deviceType})\`;
}

function generateToken(ip) {
    if (!deviceId) deviceId = generateDeviceId();
    const payload = {
        device_id: deviceId,
        ip: ip || '0.0.0.0',
        timestamp: Math.floor(Date.now() / 1000),
        random: Math.random().toString(36).substring(2, 12)
    };
    return safeBase64Encode(JSON.stringify(payload));
}

const httpFetch = (url, options = {}) => new Promise((resolve, reject) => {
    const headers = { ...(options.headers || {}) };
    if (!options.noAuth) {
        if (userToken) headers['X-Token'] = userToken;
        if (clientHeader) headers['X-Client'] = clientHeader;
    }
    if (!headers['User-Agent']) {
        headers['User-Agent'] = 'lx-music';
    }
    const finalOptions = { ...options, headers };
    request(url, finalOptions, (err, resp) => {
        if (err) return reject(err);
        const body = safeParseBody(resp.body);
        resolve({ body, statusCode: resp.statusCode, headers: resp.headers || {} });
    });
});

// -------------------- 音质映射 --------------------
function mapQuality(target, avail) {
    const pm = { '臻品母带': 'jymaster', '臻品音质2.0': 'sky', '臻品音质AI': 'jyeffect', '臻品音质': 'jyeffect', 'Hires 无损24-Bit': 'hires', 'Hi-Res': 'hires', 'FLAC': 'flac', '320k': '320k', '192k': '192k', '128k': '128k' };
    if (avail.includes(target)) return target;
    const m = pm[target]; if (m && avail.includes(m)) return m;
    const order = ['jymaster', 'sky', 'jyeffect', 'hires', 'flac24bit', 'flac', '320k', '192k', '128k'];
    for (const q of order) if (avail.includes(q)) return q;
    return avail[0] || '128k';
}

// -------------------- 网络接口 --------------------
async function fetchIp() {
    try {
        const r = await httpFetch(buildUrl('primary', 'ip'), { timeout: 3000 });
        if (r.body?.ip) {
            userIp = r.body.ip;
            userToken = generateToken(userIp);
        }
    } catch (e) {}
}

async function getWyGDUrl(id, q) {
    const brMap = { '128k':'128','192k':'192','320k':'320','flac':'740','flac24bit':'999' };
    const url = buildUrl('gdStudio', 'gdApi', \`&\${URL_CONFIG.gdParams}&types=url&source=netease&id=\${id}&br=\${brMap[q]||'320'}\`);
    const resp = await httpFetch(url, { 
        headers: { 'User-Agent': 'LX-Music-Mobile' }, 
        timeout: 8000,
        noAuth: true
    });
    if (resp.statusCode !== 200 || !resp.body.url) {
        const status = resp.statusCode;
        throw new Error(\`GD接口状态\${status}，未返回音频\`);
    }
    return { url: resp.body.url, lyric: null, cover: null };
}

async function getWyVipUrl(id, q) {
    const level = NETEASE_VIP_LEVEL_MAP[q];
    if (!level) throw new Error('不支持该品质');
    const url = buildUrl('vip', 'vipApi', \`?id=\${id}&level=\${level}\`);
    const resp = await httpFetch(url, { 
        headers: { 'User-Agent': 'LX-Music-Mobile' }, 
        timeout: 8000,
        noAuth: true
    });
    if (resp.statusCode !== 200 || resp.body.code !== 200 || !resp.body.data?.url) {
        const status = resp.statusCode;
        throw new Error(\`VIP接口状态\${status}，未返回音频\`);
    }
    return { url: resp.body.data.url, lyric: null, cover: null };
}

async function getUrlFromBackend(source, musicInfo, quality) {
    const backendSource = SOURCE_MAP[source] || source;
    const baseUrl = buildUrl('primary', 'backend');
    const params = {};
    if (backendSource === 'kg') {
        const types = musicInfo._types || {};
        params.source = 'kg';
        params.quality = quality || '';
        params.songmid = musicInfo.songmid || musicInfo.id || '';
        params.albumId = musicInfo.albumId || '';
        params.mainHash = musicInfo.hash || '';
        if (types[quality]?.hash) params.hash = types[quality].hash;
    } else {
        params.source = backendSource;
        params.name = musicInfo.name || '';
        params.singer = musicInfo.singer || '';
        params.songmid = musicInfo.songmid || musicInfo.id || '';
        params.interval = musicInfo.interval || '';
        params.albumName = musicInfo.albumName || musicInfo.album || '';
        params.quality = quality || '';
    }
    const query = Object.keys(params).map(k => \`\${encodeURIComponent(k)}=\${encodeURIComponent(params[k])}\`).join('&');
    const url = \`\${baseUrl}?\${query}\`;
    const resp = await httpFetch(url, { method: 'GET', timeout: 8000 });
    if (resp.statusCode !== 200) throw new Error(\`后端接口状态\${resp.statusCode}\`);
    const data = resp.body;
    if (data.code !== 200 || !data.url) throw new Error(data.msg || '后端无可用链接');
    return { url: data.url, lyric: data.lrc || null, cover: data.picture || null };
}

async function fetchMusicUrl(source, musicInfo, quality) {
    const id = musicInfo.hash ?? musicInfo.songmid ?? musicInfo.id;
    if (!id) throw new Error('缺少 songId');
    const actualQuality = mapQuality(quality, MUSIC_QUALITIES[source] || ['128k','320k','flac']);
    let result = { url: '', lyric: null, cover: null };
    if (source === 'wy') {
        if (NETEASE_VIP_QUALITY_SET.has(actualQuality)) {
            try { result = await getWyVipUrl(id, actualQuality); } catch (e) {}
        }
        if (!result.url) result = await getWyGDUrl(id, actualQuality);
    } else {
        result = await getUrlFromBackend(source, musicInfo, actualQuality);
    }
    extraCache.set(id, { lyric: result.lyric, cover: result.cover });
    return result.url;
}

// -------------------- 初始化逻辑 --------------------
async function checkUpdate() {
    const versionUrls = [
        buildUrl('primary', 'version') + '?ver=' + encodeURIComponent(SCRIPT_VERSION),
        buildUrl('fallback', 'version') + '?ver=' + encodeURIComponent(SCRIPT_VERSION)
    ];
    try {
        const resp = await Promise.any(versionUrls.map(u => httpFetch(u, { timeout: 5000 })));
        if (resp.statusCode === 200 && resp.body && resp.body.update_url) {
            send(EVENT_NAMES.updateAlert, {
                log: resp.body.message || \`发现新版本 \${resp.body.version || ''}\`,
                updateUrl: resp.body.update_url
            });
        }
    } catch (e) {}
}

// -------------------- 事件处理 --------------------
on(EVENT_NAMES.request, async ({ action, source, info }) => {
    if (!source || !MUSIC_QUALITIES[source]) throw new Error(\`不支持的音乐源: \${source}\`);
    if (action === 'musicUrl') {
        if (!info?.musicInfo || !info.type) throw new Error('参数不完整');
        return fetchMusicUrl(source, info.musicInfo, info.type);
    }
    const id = info?.musicInfo?.hash ?? info?.musicInfo?.songmid ?? info?.musicInfo?.id;
    const cached = extraCache.get(id);
    if (action === 'lyric') return cached?.lyric ? { lyric: cached.lyric, tlyric: '' } : null;
    if (action === 'pic') return cached?.cover || null;
    throw new Error(\`不支持的操作: \${action}\`);
});

// -------------------- 启动 --------------------
(async () => {
    deviceId = generateDeviceId();
    clientHeader = buildClientHeader();
    userToken = generateToken(null);
    
    availablePlatforms = ['wy', 'tx', 'kg', 'kw', 'mg'];
    const sources = {};
    availablePlatforms.forEach(p => { sources[p] = { name: PLATFORM_NAMES[p], type: 'music', actions: ['musicUrl', 'lyric', 'pic'], qualitys: MUSIC_QUALITIES[p] }; });
    send(EVENT_NAMES.inited, { status: true, sources });

    fetchIp();
    checkUpdate();
})();`},{file:"聚合音源 特供版.js",script:`/*!
 * @name 全豆要[聚合音源]
 * @description 迭代9.3版本，聚合 星海/溯音/念心/长青/歌一刀专属汽水音乐，多链路自动回退
 * @version 9.3 93特供版 DeepSeek优化
 * @author 全豆要 and Gemini优化 Toskysun去混淆 TZB679兼容性处理
 * @contribution DeepSeek优化
 */

// --- 常量定义 ---
const CACHE_TTL_MS = 21600000;        // 6小时
const CACHE_MAX_SIZE = 500;
const HTTP_URL_REGEX = /^https?:\\/\\//i;

// API 端点
const XINGHAI_MAIN_API = "https://music-api.gdstudio.xyz/api.php?use_xbridge3=true&loader_name=forest&need_sec_link=1&sec_link_scene=im&theme=light";
const XINGHAI_BACKUP_API = "https://music-dl.sayqz.com/api/";
const SUYIN_QQ_API = "https://oiapi.net/api/QQ_Music";
const SUYIN_QQ_KEY = "oiapi-ef6133b7-ac2f-dc7d-878c-d3e207a82575";
const SUYIN_163_API = "https://oiapi.net/api/Music_163";
const SUYIN_KUWO_API = "https://oiapi.net/api/Kuwo";
const SUYIN_MIGU_API = "https://api.xcvts.cn/api/music/migu";

// Huibq / 聆川 API（需自行配置有效地址与密钥）
const HUIBQ_API = "https://api.huibq.com/api";           // 请替换为实际地址
const HUIBQ_REQUEST_KEY = "your_key_here";               // 请替换为实际密钥
const LINGCHUAN_API = "https://api.lingchuan.com/v1";    // 请替换为实际地址

// 长青SVIP URL模板
const CHANGQING_URL_TEMPLATES = {
  tx: "http://175.27.166.236/kgqq/qq.php?type=mp3&id={id}&level={level}",
  wy: "http://175.27.166.236/wy/wy.php?type=mp3&id={id}&level={level}",
  kw: "https://musicapi.haitangw.net/music/kw.php?type=mp3&id={id}&level={level}",
  kg: "https://music.haitangw.cc/kgqq/kg.php?type=mp3&id={id}&level={level}",
  mg: "https://music.haitangw.cc/musicapi/mg.php?type=mp3&id={id}&level={level}"
};

// 念心SVIP URL模板
const NIANXIN_URL_TEMPLATES = {
  tx: "https://music.nxinxz.com/kgqq/tx.php?id={id}&level={level}&type=mp3",
  wy: "http://music.nxinxz.com/wy.php?id={id}&level={level}&type=mp3",
  kw: "http://music.nxinxz.com/kw.php?id={id}&level={level}&type=mp3",
  kg: "https://music.nxinxz.com/kgqq/kg.php?id={id}&level={level}&type=mp3",
  mg: "http://music.nxinxz.com/mg.php?id={id}&level={level}&type=mp3"
};

// 汽水VIP
const QISHUI_SOURCE_ID = "qsvip";
const QISHUI_SOURCE_NAME = "汽水VIP";
const QISHUI_API_HTTPS = "https://api.vsaa.cn/api/music.qishui.vip";
const QISHUI_API_HTTP = "http://api.vsaa.cn/api/music.qishui.vip";
const QISHUI_PROXY_API = "https://proxy.qishui.vsaa.cn/qishui/proxy";

// 各平台支持的音质列表
const PLATFORM_QUALITIES = {
  wy: ["24bit", "flac", "320k", "192k", "128k"],
  tx: ["24bit", "flac", "320k", "192k", "128k"],
  kw: ["24bit", "flac", "320k", "192k", "128k"],
  kg: ["24bit", "flac", "320k", "192k", "128k"],
  mg: ["24bit", "flac", "320k", "192k", "128k"]
};

// 平台ID映射到星海主API名称
const PLATFORM_TO_XINGHAI = {
  wy: "netease",
  tx: "tencent",
  kw: "kuwo",
  kg: "kugou",
  mg: "migu"
};

// 音质到星海主API码率参数
const QUALITY_TO_BR = {
  "128k": "128",
  "192k": "192",
  "320k": "320",
  flac: "740",
  flac24bit: "999",
  "24bit": "999"
};

// 平台ID映射到星海备API名称
const PLATFORM_TO_XINGHAI_BACKUP = {
  wy: "netease",
  tx: "qq",
  kw: "kuwo"
};

// 音质到溯音QQ码率参数
const QUALITY_TO_SUYIN_QQ_BR = {
  "128k": 7,
  "320k": 5,
  flac: 4,
  hires: 3,
  atmos: 2,
  master: 1,
  "24bit": 1
};

// 音质到溯音酷我码率参数
const QUALITY_TO_KUWO_BR = {
  flac: 1,
  "320k": 5,
  "128k": 7,
  "24bit": 1
};

// 高品质音质集合
const HIRES_QUALITY_SET = new Set(["24bit", "flac", "flac24bit", "hires", "master", "atmos"]);

// 音质优先级（用于选择最接近请求质量的可用音质）
const QUALITY_PRIORITY = ["flac24bit", "flac", "320k", "192k", "128k"];

// URL缓存（简单的Map，按写入顺序淘汰最早条目）
const urlCache = new Map();

const { EVENT_NAMES, request, on, send } = globalThis.lx;

// --- 辅助函数 ---

/**
 * 发起HTTP请求，返回 Promise<{statusCode, headers, body}>
 */
function httpRequest(url, options = { method: "GET" }) {
  return new Promise((resolve, reject) => {
    request(url, { timeout: 2000, ...options }, (err, res) => {
      if (err) return reject(new Error(\`请求错误: \${err.message}\`));
      let body = res?.body;
      if (typeof body === "string") {
        const trimmed = body.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.startsWith('"')) {
          try {
            body = JSON.parse(trimmed);
          } catch (e) { /* 保持原始字符串 */ }
        }
      }
      resolve({
        statusCode: res?.statusCode ?? 0,
        headers: res?.headers || {},
        body
      });
    });
  });
}

/**
 * GET请求，自动拼接查询参数，返回响应body（已解析）
 */
async function httpGet(url, params = {}) {
  const queryStr = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => \`\${encodeURIComponent(k)}=\${encodeURIComponent(v)}\`)
    .join("&");
  const fullUrl = url + (queryStr ? (url.includes("?") ? "&" : "?") + queryStr : "");
  const res = await httpRequest(fullUrl, { method: "GET", timeout: 2000 });
  if (res.statusCode >= 400) throw new Error(\`HTTP错误: \${res.statusCode}\`);
  return res.body;
}

/**
 * POST请求，body为JSON，返回响应body
 */
async function httpPost(url, body = {}, timeout = 5000) {
  const res = await httpRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    timeout
  });
  if (res.statusCode >= 400) throw new Error(\`HTTP错误: \${res.statusCode}\`);
  return res.body;
}

/**
 * 带fallback的GET请求（汽水VIP自动尝试https/http）
 */
async function httpGetWithFallback(url, params = {}, timeout = 5000) {
  const urls = url === QISHUI_API_HTTPS ? [QISHUI_API_HTTPS, QISHUI_API_HTTP] : [url];
  let lastError = null;
  for (const u of urls) {
    try {
      const fullUrl = u + buildQueryString(params);
      const res = await httpRequest(fullUrl, { method: "GET", timeout });
      if (res.statusCode >= 400) throw new Error(\`HTTP \${res.statusCode}\`);
      return res.body;
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError || new Error("汽水VIP请求失败");
}

/**
 * 构建查询字符串（不带问号，仅参数部分）
 */
function buildQueryString(params = {}) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => \`\${encodeURIComponent(k)}=\${encodeURIComponent(v)}\`);
  return parts.length ? "?" + parts.join("&") : "";
}

/**
 * 标准化音质字符串（低/标准/无损）
 */
function normalizeQuality(quality) {
  const q = String(quality || "").toLowerCase();
  if (q === "128k") return "low";
  if (q === "320k") return "standard";
  if (q === "flac" || q === "flac24bit") return "lossless";
  return "128k";
}

/**
 * 从支持的音质列表中选择最接近请求音质的实际可用音质
 */
function selectQuality(requestedQuality, supportedQualities) {
  const requested = String(requestedQuality || "128k").toLowerCase();
  if (supportedQualities.includes(requested)) return requested;
  const idx = QUALITY_PRIORITY.indexOf(requested);
  const start = idx >= 0 ? idx : QUALITY_PRIORITY.length - 1;
  for (let i = start; i < QUALITY_PRIORITY.length; i++) {
    if (supportedQualities.includes(QUALITY_PRIORITY[i])) return QUALITY_PRIORITY[i];
  }
  for (let i = QUALITY_PRIORITY.length - 1; i >= 0; i--) {
    if (supportedQualities.includes(QUALITY_PRIORITY[i])) return QUALITY_PRIORITY[i];
  }
  return supportedQualities[0] || "128k";
}

/**
 * 将音质转换为网易云/长青/念心所需的level格式
 */
function qualityToNetease(quality) {
  const q = String(quality || "128k").toLowerCase();
  if (q === "flac" || q === "flac24bit" || q === "hires" || q === "master" || q === "atmos") return "lossless";
  if (q === "320k" || q === "192k") return "exhigh";
  return "standard";
}

/**
 * 将音质转换为溯音QQ码率参数
 */
function qualityToSuyinQQ(quality) {
  const q = String(quality || "128k").toLowerCase();
  if (q === "flac24bit") return "hires";
  if (q === "192k") return "320k";
  return QUALITY_TO_SUYIN_QQ_BR[q] ? q : "128k";
}

/**
 * 获取移动端User-Agent
 */
function getMobileUserAgent() {
  return "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";
}

/**
 * 从歌曲信息中提取各种可能的ID
 */
function getSongId(songInfo) {
  return (songInfo?.id || songInfo?.songmid || songInfo?.songId || songInfo?.hash || songInfo?.rid || songInfo?.mid || songInfo?.strMediaMid || songInfo?.mediaId || "").toString();
}

/**
 * 获取歌曲的hash或mid（优先hash）
 */
function getHashOrMid(songInfo) {
  return songInfo?.hash ?? songInfo?.songmid ?? songInfo?.id ?? null;
}

/**
 * 获取QQ音乐歌曲ID（区分mid和songid）
 */
function getQQSongId(songInfo) {
  const mid = songInfo?.meta?.qq?.mid || songInfo?.meta?.mid || songInfo?.songmid ||
    (typeof songInfo?.id === "string" && !/^\\d+$/.test(songInfo.id) ? songInfo.id : null);
  if (mid) return { type: "mid", value: mid };
  const songid = songInfo?.meta?.qq?.songid || songInfo?.meta?.songid ||
    (typeof songInfo?.id === "number" ? songInfo.id :
      (typeof songInfo?.id === "string" && /^\\d+$/.test(songInfo.id) ? Number(songInfo.id) : null));
  if (songid) return { type: "songid", value: songid };
  return null;
}

/**
 * 标准化歌曲信息（供汽水VIP搜索使用）
 */
function normalizeSongInfo(raw) {
  const id = raw?.id || raw?.vid ? String(raw.id || raw.vid) : "";
  return {
    id,
    songmid: id,
    hash: id,
    name: raw?.name ? String(raw.name) : "未知歌曲",
    singer: raw?.artists ? String(raw.artists) : "未知歌手",
    albumName: raw?.album ? String(raw.album) : "",
    duration: raw?.duration ? Math.floor(Number(raw.duration) / 1000) : 0,
    pic: raw?.cover || raw?.pic ? String(raw.cover || raw.pic) : "",
    _raw: raw || {}
  };
}

/**
 * 获取响应数据中的第一条记录
 */
function getFirstData(response) {
  const data = response?.data;
  if (Array.isArray(data)) return data[0] || null;
  if (data && typeof data === "object" && data[0]) return data[0];
  return null;
}

/**
 * 标准化关键词（去除括号、空格、特殊字符，转小写）
 */
function normalizeKeyword(keyword) {
  if (!keyword) return "";
  return String(keyword)
    .replace(/\\(\\s*Live\\s*\\)/gi, "")
    .replace(/\\([^)]*\\)/g, "")
    .replace(/\\s+/g, "")
    .replace(/[^\\w\\u4e00-\\u9fa5]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * 标题模糊匹配（双向包含）
 */
function titleMatch(a, b) {
  const na = normalizeKeyword(a);
  const nb = normalizeKeyword(b);
  if (!na || !nb) return true;
  return na.includes(nb) || nb.includes(na);
}

/**
 * 构建搜索关键词列表（标题+专辑、标题+歌手、仅标题）
 */
function buildSearchKeywords(songInfo) {
  const keywords = [];
  const name = songInfo?.name || "";
  const album = songInfo?.albumName || songInfo?.album || "";
  const singer = songInfo?.singer || "";
  if (name && album) {
    const kw = normalizeKeyword(name + album);
    if (kw) keywords.push({ keyword: kw, strict: true });
  }
  if (name && singer) {
    const kw = normalizeKeyword(name + singer);
    if (kw) keywords.push({ keyword: kw, strict: true });
  }
  if (name) {
    const kw = normalizeKeyword(name);
    if (kw) keywords.push({ keyword: kw, strict: false });
  }
  return keywords;
}

/**
 * 歌曲信息匹配（用于溯音酷我）
 */
function songInfoMatch(responseData, songInfo) {
  const song = responseData?.song || responseData?.data?.song || "";
  const singer = responseData?.singer || responseData?.data?.singer || "";
  const album = responseData?.album || responseData?.data?.album || "";
  if (!titleMatch(song, songInfo?.name || "")) return false;
  if (songInfo?.singer && singer && !titleMatch(singer, songInfo.singer)) return false;
  if ((songInfo?.albumName || songInfo?.album) && album && !titleMatch(album, songInfo.albumName || songInfo.album)) return false;
  return true;
}

/**
 * 歌曲标题匹配（用于溯音咪咕）
 */
function songTitleMatch(responseData, songInfo) {
  if (!titleMatch(responseData?.title || "", songInfo?.name || "")) return false;
  if (songInfo?.singer && responseData?.artist && !titleMatch(responseData.artist, songInfo.singer)) return false;
  if ((songInfo?.albumName || songInfo?.album) && responseData?.album && !titleMatch(responseData.album, songInfo.albumName || songInfo.album)) return false;
  return true;
}

/**
 * 从消息文本中解析歌曲信息（歌名/歌手/专辑）
 */
function parseMessageSongInfo(message) {
  if (!message) return null;
  const result = {};
  const lines = String(message).split("\\n");
  for (const line of lines) {
    if (line.startsWith("歌名：")) result.song = line.replace("歌名：", "").trim();
    if (line.startsWith("歌手：")) result.singer = line.replace("歌手：", "").trim();
    if (line.startsWith("专辑：")) result.album = line.replace("专辑：", "").trim();
  }
  return result.song ? result : null;
}

/**
 * 验证URL合法性
 */
function validateUrl(url, sourceName) {
  if (!url || typeof url !== "string") throw new Error(\`\${sourceName}返回空URL\`);
  if (!HTTP_URL_REGEX.test(url.trim())) throw new Error(\`\${sourceName}非法URL格式\`);
  return url;
}

// --- 缓存相关 ---
function buildCacheKey(prefix, songInfo, quality = "") {
  const name = songInfo?.name || "";
  const singer = songInfo?.singer || "";
  const album = songInfo?.albumName || songInfo?.album || "";
  // 简单拼接，Map大小有限，无需哈希
  return \`\${prefix}_\${name}_\${singer}_\${album}_\${quality}\`;
}

function getCachedUrl(cacheKey) {
  const entry = urlCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() - entry.timestamp >= CACHE_TTL_MS) {
    urlCache.delete(cacheKey);
    return null;
  }
  return entry.url;
}

function setCachedUrl(cacheKey, url) {
  urlCache.set(cacheKey, { url, timestamp: Date.now() });
  if (urlCache.size > CACHE_MAX_SIZE) {
    const oldestKey = urlCache.keys().next().value;
    if (oldestKey !== undefined) urlCache.delete(oldestKey);
  }
}

// --- 各音源获取URL的具体实现 ---

/* 星海主 */
async function xinghaiMainGetUrl(platform, songId, quality, songInfo) {
  const source = PLATFORM_TO_XINGHAI[platform];
  if (!source) throw new Error("星海主API不支持该平台");
  const id = songId ?? getHashOrMid(songInfo);
  if (!id) throw new Error("缺少songId");
  const selectedQuality = selectQuality(quality, ["128k", "192k", "320k", "flac", "flac24bit"]);
  const br = QUALITY_TO_BR[selectedQuality];
  if (!br) throw new Error("星海主API音质映射失败");
  const url = \`\${XINGHAI_MAIN_API}&types=url&source=\${encodeURIComponent(source)}&id=\${encodeURIComponent(id)}&br=\${br}\`;
  const res = await httpRequest(url, { method: "GET", headers: { "User-Agent": "LX-Music-Mobile", Accept: "application/json" } });
  const body = res.body;
  if (!body || typeof body !== "object" || !body.url) throw new Error(body?.message || "星海主API未返回可用URL");
  return body.url;
}

/* 星海备 */
async function xinghaiBackupGetUrl(platform, songId, quality, songInfo) {
  const source = PLATFORM_TO_XINGHAI_BACKUP[platform];
  if (!source) throw new Error("星海备API不支持该平台");
  const id = songId ?? getHashOrMid(songInfo);
  if (!id) throw new Error("缺少songId");
  const selectedQuality = selectQuality(quality, ["128k", "192k", "320k", "flac", "flac24bit"]);
  return \`\${XINGHAI_BACKUP_API}?source=\${encodeURIComponent(source)}&id=\${encodeURIComponent(id)}&type=url&br=\${encodeURIComponent(selectedQuality)}\`;
}

/* Huibq */
async function huibqGetUrl(platform, songId, quality, songInfo) {
  if (!HUIBQ_API || !HUIBQ_REQUEST_KEY) throw new Error("Huibq未配置");
  const hashOrMid = songInfo?.hash ?? songInfo?.songmid;
  if (!hashOrMid) throw new Error("Huibq缺少hash/songmid");
  const selectedQuality = selectQuality(quality, ["320k", "128k"]);
  const url = \`\${HUIBQ_API}/url/\${platform}/\${encodeURIComponent(hashOrMid)}/\${encodeURIComponent(selectedQuality)}\`;
  const res = await httpRequest(url, {
    method: "GET",
    headers: { "Content-Type": "application/json", "User-Agent": getMobileUserAgent(), "X-Request-Key": HUIBQ_REQUEST_KEY }
  });
  const body = res.body;
  if (!body || typeof body !== "object" || Number.isNaN(Number(body.code))) throw new Error("Huibq返回无效");
  switch (Number(body.code)) {
    case 0:
      if (!body.url) throw new Error("Huibq返回空URL");
      return body.url;
    case 1: throw new Error("Huibq block ip");
    case 2: throw new Error("Huibq get music url failed");
    case 4: throw new Error("Huibq too many requests");
    case 5: throw new Error("Huibq param error");
    case 6: throw new Error("Huibq internal server error");
    default: throw new Error(body.message || "Huibq unknown error");
  }
}

/* 聆川 */
async function lingchuanGetUrl(platform, songId, quality, songInfo) {
  if (!LINGCHUAN_API) throw new Error("聆川未配置");
  const hashOrMid = songInfo?.hash ?? songInfo?.songmid;
  if (!hashOrMid) throw new Error("聆川缺少hash/songmid");
  const selectedQuality = selectQuality(quality, ["320k", "128k"]);
  const url = \`\${LINGCHUAN_API}/url?source=\${encodeURIComponent(platform)}&songId=\${encodeURIComponent(hashOrMid)}&quality=\${encodeURIComponent(selectedQuality)}\`;
  const res = await httpRequest(url, {
    method: "GET",
    headers: { "Content-Type": "application/json", "User-Agent": getMobileUserAgent() },
    follow_max: 5
  });
  const body = res.body;
  if (!body || typeof body !== "object" || Number.isNaN(Number(body.code))) throw new Error("聆川返回无效");
  switch (Number(body.code)) {
    case 200:
      if (!body.url) throw new Error("聆川返回空URL");
      return body.url;
    case 403: throw new Error("聆川403 forbidden");
    case 429: throw new Error("聆川429 rate limit");
    case 500: throw new Error(\`聆川500 \${body.message || "server error"}\`);
    default: throw new Error(body.message || "聆川未知错误");
  }
}

/* 溯音QQ */
async function suyinQQGetUrl(songInfo, quality) {
  const qqId = getQQSongId(songInfo);
  if (!qqId) throw new Error("溯音QQ缺少songmid/id");
  const normalizedQuality = qualityToSuyinQQ(quality);
  const startBr = QUALITY_TO_SUYIN_QQ_BR[normalizedQuality] || QUALITY_TO_SUYIN_QQ_BR["128k"];
  const brList = [startBr, 4, 5, 7]
    .filter((val, idx, arr) => arr.indexOf(val) === idx && val >= startBr)
    .sort((a, b) => a - b);
  let lastError = null;
  for (const br of brList) {
    try {
      const reqParams = { key: SUYIN_QQ_KEY, type: "json", br, n: 1 };
      if (qqId.type === "mid") reqParams.mid = qqId.value;
      else reqParams.songid = qqId.value;
      const res = await httpGet(SUYIN_QQ_API, reqParams);
      if (res?.music) return res.music;
      if (res?.url) return res.url;
      if (res?.message) {
        const match = String(res.message).match(/音频链接[：:](.+?)(?:\\n|$)/);
        if (match && match[1]) return match[1].trim();
      }
      throw new Error("溯音QQ未找到音频链接");
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error(\`溯音QQ全部音质尝试失败: \${lastError?.message || "unknown"}\`);
}

/* 溯音163 */
async function suyin163GetUrl(songInfo) {
  const id = songInfo?.songmid || songInfo?.id;
  if (!id) throw new Error("溯音163缺少songmid/id");
  const res = await httpGet(SUYIN_163_API, { id });
  if (res?.code === 0 && res?.data) {
    const item = Array.isArray(res.data) ? res.data[0] : res.data;
    if (item?.url) return item.url;
  }
  throw new Error("溯音163获取失败");
}

/* 溯音酷我（搜索） */
async function suyinKuwoSearch(keyword, br, songInfo = null) {
  const res = await httpGet(SUYIN_KUWO_API, { msg: keyword, n: 1, br });
  if (res?.data?.url) {
    if (songInfo && !songInfoMatch(res, songInfo)) throw new Error("溯音酷我歌曲信息不匹配");
    return res.data.url;
  }
  if (res?.message) {
    const match = String(res.message).match(/音乐链接[：:](\\S+)/);
    if (match && match[1]) {
      if (songInfo) {
        const parsed = parseMessageSongInfo(res.message);
        if (parsed && !songInfoMatch(parsed, songInfo)) throw new Error("溯音酷我歌曲信息不匹配");
      }
      return match[1];
    }
  }
  throw new Error("溯音酷我未找到链接");
}

async function suyinKuwoGetUrl(songInfo, quality) {
  if (!songInfo?.name) throw new Error("溯音酷我需要歌曲名");
  const cacheKey = buildCacheKey("kw", songInfo, quality);
  const cached = getCachedUrl(cacheKey);
  if (cached) return cached;
  const selectedQuality = selectQuality(quality, ["flac", "320k", "128k"]);
  const br = QUALITY_TO_KUWO_BR[selectedQuality] || 1;
  const keywords = buildSearchKeywords(songInfo);
  let lastError = null;
  for (const item of keywords) {
    try {
      const url = await suyinKuwoSearch(item.keyword, br, item.strict ? songInfo : null);
      if (url) {
        setCachedUrl(cacheKey, url);
        return url;
      }
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error(\`溯音酷我失败: \${lastError?.message || "unknown"}\`);
}

/* 溯音咪咕 */
async function suyinMiguGetUrl(songInfo) {
  if (!songInfo?.name) throw new Error("溯音咪咕需要歌曲名");
  const cacheKey = buildCacheKey("mg", songInfo);
  const cached = getCachedUrl(cacheKey);
  if (cached) return cached;
  const keywords = buildSearchKeywords(songInfo);
  let lastError = null;
  for (const item of keywords) {
    try {
      const res = await httpGet(SUYIN_MIGU_API, { gm: item.keyword, n: 1, num: 1, type: "json" });
      if (res?.code === 200 && res?.musicInfo) {
        if (item.strict && !songTitleMatch(res, songInfo)) throw new Error("溯音咪咕歌曲信息不匹配");
        setCachedUrl(cacheKey, res.musicInfo);
        return res.musicInfo;
      }
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error(\`溯音咪咕失败: \${lastError?.message || "unknown"}\`);
}

/* 溯音统一入口 */
async function suyinGetUrl(platform, songId, quality, songInfo) {
  switch (platform) {
    case "tx": return suyinQQGetUrl(songInfo, quality);
    case "wy": return suyin163GetUrl(songInfo);
    case "kw": return suyinKuwoGetUrl(songInfo, quality);
    case "mg": return suyinMiguGetUrl(songInfo);
    default: throw new Error("溯音不支持该平台");
  }
}

/* 长青SVIP */
async function changqingGetUrl(platform, songId, quality, songInfo) {
  const template = CHANGQING_URL_TEMPLATES[platform];
  if (!template) throw new Error("长青SVIP不支持该平台");
  const id = getPlatformSongId(platform, songInfo);
  if (!id) throw new Error("长青SVIP缺少songId");
  const level = qualityToNetease(quality);
  return template.replace("{id}", encodeURIComponent(String(id))).replace("{level}", encodeURIComponent(level));
}

/* 念心SVIP */
async function nianxinGetUrl(platform, songId, quality, songInfo) {
  const template = NIANXIN_URL_TEMPLATES[platform];
  if (!template) throw new Error("念心SVIP不支持该平台");
  const id = getPlatformSongId(platform, songInfo);
  if (!id) throw new Error("念心SVIP缺少songId");
  const level = qualityToNetease(quality);
  return template.replace("{id}", encodeURIComponent(String(id))).replace("{level}", encodeURIComponent(level));
}

/* 汽水VIP */
async function qishuiSearch(keyword, page = 1, pageSize = 30) {
  if (!keyword) return { isEnd: true, list: [] };
  const res = await httpGetWithFallback(QISHUI_API_HTTPS, {
    act: "search", keywords: keyword, page, pagesize: pageSize, type: "music"
  }, 15000);
  const list = Array.isArray(res?.data?.lists) ? res.data.lists : [];
  const total = res?.data?.total ? Number(res.data.total) : list.length;
  return {
    isEnd: list.length < pageSize,
    list: list.map(normalizeSongInfo),
    total
  };
}

async function qishuiGetUrl(songInfo, quality) {
  const songId = getSongId(songInfo);
  if (!songId) throw new Error("汽水VIP缺少歌曲ID");
  const res = await httpGetWithFallback(QISHUI_API_HTTPS, {
    act: "song", id: songId, quality: normalizeQuality(quality)
  }, 20000);
  const data = getFirstData(res);
  if (!data?.url) throw new Error("汽水VIP未返回可用URL");
  if (data.ekey) {
    const proxyRes = await httpPost(QISHUI_PROXY_API, {
      url: data.url, key: data.ekey, filename: data.filename || "KMusic", ext: data.fileExtension || "aac"
    }, 60000);
    if (Number(proxyRes?.code) === 200 && proxyRes?.url) return String(proxyRes.url);
    throw new Error("汽水VIP代理解密失败");
  }
  return String(data.url);
}

async function qishuiGetLyric(songInfo) {
  const songId = getSongId(songInfo);
  if (!songId) return { lyric: "" };
  const res = await httpGetWithFallback(QISHUI_API_HTTPS, { act: "song", id: songId }, 15000);
  const data = getFirstData(res);
  return { lyric: data?.lyric ? String(data.lyric) : "" };
}

async function qishuiHandler(action, params = {}) {
  if (action === "musicSearch" || action === "search") {
    const keyword = params?.keyword ? String(params.keyword) : "";
    const page = params?.page ? Number(params.page) : 1;
    const pageSize = params?.pagesize ? Number(params.pagesize) : 30;
    return qishuiSearch(keyword, page, pageSize);
  }
  if (action === "musicUrl") {
    if (!params?.musicInfo) throw new Error("请求参数不完整");
    const url = await qishuiGetUrl(params.musicInfo, params.type);
    return validateUrl(url, "汽水VIP");
  }
  if (action === "lyric") return qishuiGetLyric(params?.musicInfo || {});
  throw new Error("action not support");
}

// --- 工具函数：获取平台对应的歌曲ID ---
function getPlatformSongId(platform, songInfo) {
  if (platform === "kg") return songInfo?.hash || songInfo?.songmid || songInfo?.id || songInfo?.rid || songInfo?.mid || null;
  if (platform === "tx") {
    const qqId = getQQSongId(songInfo);
    if (qqId?.value) return qqId.value;
  }
  return songInfo?.songmid || songInfo?.id || songInfo?.songId || songInfo?.rid || songInfo?.hash || null;
}

// --- 音源处理器注册表 ---
const SOURCE_HANDLERS = {
  xinghai: { name: "星海主", fn: xinghaiMainGetUrl },
  xinghaiBackup: { name: "星海备", fn: xinghaiBackupGetUrl },
  huibq: { name: "Huibq", fn: huibqGetUrl },
  lingchuan: { name: "聆川", fn: lingchuanGetUrl },
  suyinQQ: { name: "溯音QQ", fn: (platform, songId, quality, songInfo) => suyinGetUrl("tx", songId, quality, songInfo) },
  suyin163: { name: "溯音163", fn: (platform, songId, quality, songInfo) => suyinGetUrl("wy", songId, quality, songInfo) },
  suyinSearch: { name: "溯音搜索", fn: (platform, songId, quality, songInfo) => suyinGetUrl("kw", songId, quality, songInfo) },
  suyinMigu: { name: "溯音咪咕", fn: (platform, songId, quality, songInfo) => suyinGetUrl("mg", songId, quality, songInfo) },
  changqingVip: { name: "长青SVIP", fn: changqingGetUrl },
  nianxinVip: { name: "念心SVIP", fn: nianxinGetUrl }
};

// --- 构建音源链（按平台和是否高品质排序）---
function buildSourceChain(platform, isHires, quality) {
  const chain = [];
  // 基础链：星海主、Huibq、溯音各平台、聆川、长青、念心
  if (SOURCE_HANDLERS.xinghai) chain.push(SOURCE_HANDLERS.xinghai);
  if (SOURCE_HANDLERS.huibq) chain.push(SOURCE_HANDLERS.huibq);
  if (platform === "wy" && SOURCE_HANDLERS.suyin163) chain.push(SOURCE_HANDLERS.suyin163);
  if (platform === "tx" && SOURCE_HANDLERS.suyinQQ) chain.push(SOURCE_HANDLERS.suyinQQ);
  if (platform === "kw" && SOURCE_HANDLERS.suyinSearch) chain.push(SOURCE_HANDLERS.suyinSearch);
  if (platform === "mg" && SOURCE_HANDLERS.suyinMigu) chain.push(SOURCE_HANDLERS.suyinMigu);
  if (SOURCE_HANDLERS.lingchuan) chain.push(SOURCE_HANDLERS.lingchuan);
  if (SOURCE_HANDLERS.changqingVip) chain.push(SOURCE_HANDLERS.changqingVip);
  if (SOURCE_HANDLERS.nianxinVip) chain.push(SOURCE_HANDLERS.nianxinVip);
  return chain;
}

// --- 带fallback获取URL（并发前3个，失败后顺序剩余）---
async function getUrlWithFallback(platform, songInfo, quality) {
  if (!platform || typeof platform !== "string" || !PLATFORM_QUALITIES[platform]) {
    throw new Error("无效的平台参数");
  }
  if (!songInfo || typeof songInfo !== "object") {
    throw new Error("无效的歌曲信息");
  }
  const resolvedQuality = quality || "128k";
  const selectedQuality = selectQuality(resolvedQuality, PLATFORM_QUALITIES[platform]);
  const songId = getHashOrMid(songInfo);
  const isHires = HIRES_QUALITY_SET.has(resolvedQuality.toLowerCase());
  const chain = buildSourceChain(platform, isHires, selectedQuality);
  if (!chain.length) throw new Error("未找到可用fallback链");

  const errors = [];
  // 并发尝试前3个源
  const firstBatch = chain.slice(0, 3);
  if (firstBatch.length) {
    const results = await Promise.allSettled(firstBatch.map(handler =>
      handler.fn(platform, songId, selectedQuality, songInfo).then(url => validateUrl(url, handler.name))
    ));
    for (const result of results) {
      if (result.status === "fulfilled") return result.value;
      errors.push(result.reason?.message || "unknown");
    }
  }
  // 顺序尝试剩余源
  for (const handler of chain.slice(3)) {
    try {
      const url = await handler.fn(platform, songId, selectedQuality, songInfo);
      return validateUrl(url, handler.name);
    } catch (e) {
      errors.push(\`\${handler.name}: \${e.message}\`);
    }
  }
  throw new Error(\`所有源均失败: \${errors.join("; ")}\`);
}

// --- 音源配置与注册 ---
const sourceConfig = {};
const PLATFORM_NAMES = {
  wy: "网易云音乐", tx: "QQ音乐", kw: "酷我音乐", kg: "酷狗音乐", mg: "咪咕音乐"
};
Object.keys(PLATFORM_QUALITIES).forEach(platform => {
  sourceConfig[platform] = {
    name: PLATFORM_NAMES[platform],
    type: "music",
    actions: ["musicUrl"],
    qualitys: PLATFORM_QUALITIES[platform]
  };
});
sourceConfig[QISHUI_SOURCE_ID] = {
  name: QISHUI_SOURCE_NAME,
  type: "music",
  actions: ["musicSearch", "musicUrl", "lyric"],
  qualitys: ["128k", "320k", "flac", "flac24bit"]
};

// --- 事件监听 ---
on(EVENT_NAMES.request, ({ action, source, info }) => {
  if (source === QISHUI_SOURCE_ID) {
    return qishuiHandler(action, info);
  }
  if (action !== "musicUrl") {
    return Promise.reject(new Error("action not support"));
  }
  if (!info?.musicInfo) {
    return Promise.reject(new Error("请求参数不完整"));
  }
  return getUrlWithFallback(source, info.musicInfo, info.type || "128k")
    .then(url => Promise.resolve(url))
    .catch(err => Promise.reject(err));
});

send(EVENT_NAMES.inited, {
  openDevTools: false,
  sources: sourceConfig
});

// 简单日志，供调试
console.log("全豆要聚合音源 v9.3 已加载");`},{file:"野花音源.js",script:`/**
 * @name 野花🌷
 * @version 1.0.0
 */
function O(){const R=['\\x33\\x39\\x33\\x34\\x36\\x38\\x35\\x45\\x4a\\x73\\x79\\x70\\x6e','\\x34\\x31\\x35\\x35\\x32\\x32\\x30\\x73\\x68\\x6a\\x6d\\x71\\x64','\\x63\\x6f\\x64\\x65','\\x68\\x61\\x73\\x68','\\x63\\x6f\\x70\\x79\\x72\\x69\\x67\\x68\\x74\\x49','\\x47\\x45\\x54','\\x68\\x65\\x78','\\x67\\x53\\x79\\x45\\x4d','\\x34\\x30\\x30\\x39\\x33\\x33\\x36\\x74\\x77\\x4e\\x48\\x5a\\x78','\\x51\\x54\\x64\\x63\\x58','\\x76\\x4d\\x49\\x75\\x4e','\\x61\\x63\\x47\\x4f\\x7a','\\x69\\x61\\x6d\\x7a\\x57','\\x6b\\x77\\x7c\\x31\\x32\\x38\\x6b\\x26\\x77\\x79','\\x2f\\x75\\x72\\x6c\\x2f','\\x6e\\x4e\\x68\\x44\\x6e','\\x62\\x75\\x66\\x54\\x6f\\x53\\x74\\x72\\x69\\x6e','\\x31\\x31\\x39\\x39\\x32\\x34\\x5a\\x68\\x75\\x61\\x72\\x61','\\x6c\\x78\\x2d\\x6d\\x75\\x73\\x69\\x63\\x2f','\\x73\\x74\\x72\\x69\\x6e\\x67\\x69\\x66\\x79','\\x77\\x65\\x72\\x2e\\x74\\x65\\x6d\\x70\\x6d\\x75','\\x64\\x61\\x74\\x61','\\x51\\x56\\x6a\\x7a\\x45','\\x2f\\x75\\x72\\x6c\\x69\\x6e\\x66\\x6f\\x2f','\\x6d\\x75\\x73\\x69\\x63\\x55\\x72\\x6c','\\x31\\x35\\x31\\x30\\x37\\x30\\x37\\x69\\x56\\x6d\\x41\\x73\\x6f','\\x6d\\x64\\x35','\\x43\\x78\\x6c\\x49\\x4c','\\x6d\\x61\\x74\\x63\\x68','\\x72\\x65\\x71\\x75\\x65\\x73\\x74','\\x39\\x35\\x39\\x31\\x31\\x36\\x6c\\x45\\x57\\x57\\x5a\\x43','\\x73\\x6f\\x6e\\x67\\x6d\\x69\\x64','\\x73\\x6f\\x75\\x72\\x63\\x65\\x73','\\x68\\x74\\x74\\x70\\x3a\\x2f\\x2f\\x66\\x6c\\x6f','\\x62\\x75\\x66\\x66\\x65\\x72','\\x31\\x34\\x4e\\x6f\\x69\\x54\\x4e\\x48','\\x73\\x70\\x6c\\x69\\x74','\\x35\\x31\\x35\\x39\\x50\\x66\\x57\\x61\\x6f\\x70','\\x69\\x6e\\x69\\x74\\x65\\x64','\\x44\\x46\\x6a\\x62\\x4e','\\x7c\\x31\\x32\\x38\\x6b\\x26\\x6d\\x67\\x7c\\x31','\\x73\\x69\\x63\\x73\\x2e\\x74\\x6b\\x2f\\x76\\x31','\\x31\\x30\\x38\\x37\\x38\\x58\\x6e\\x65\\x61\\x4b\\x46','\\x74\\x61\\x67','\\x66\\x72\\x6f\\x6d','\\x4b\\x45\\x57\\x45\\x4d','\\x33\\x4d\\x68\\x4b\\x46\\x79\\x4a','\\x77\\x72\\x44\\x44\\x46','\\x51\\x58\\x63\\x45\\x49','\\x75\\x49\\x54\\x67\\x78','\\x32\\x38\\x6b\\x26\\x74\\x78\\x7c\\x31\\x32\\x38','\\x49\\x4c\\x6b\\x4a\\x4b','\\x46\\x68\\x6b\\x4e\\x48','\\x63\\x72\\x79\\x70\\x74\\x6f','\\u670d\\u52a1\\u5668\\u5f02\\u5e38','\\x66\\x61\\x69\\x6c\\x65\\x64','\\x46\\x70\\x54\\x6d\\x50','\\x31\\x35\\x36\\x4b\\x47\\x44\\x4f\\x75\\x6e','\\x6d\\x73\\x67','\\x66\\x69\\x61\\x6c\\x65\\x64','\\x62\\x6f\\x64\\x79','\\x6b\\x26\\x6b\\x67\\x7c\\x31\\x32\\x38\\x6b','\\x4c\\x43\\x54\\x51\\x58','\\x73\\x68\\x69\\x66\\x74','\\x50\\x6b\\x4a\\x6c\\x48','\\x78\\x54\\x6d\\x67\\x67','\\x6d\\x75\\x73\\x69\\x63','\\x72\\x61\\x77\\x53\\x63\\x72\\x69\\x70\\x74','\\x39\\x57\\x51\\x79\\x76\\x6a\\x65','\\x76\\x65\\x72\\x73\\x69\\x6f\\x6e','\\x75\\x70\\x64\\x61\\x74\\x65\\x41\\x6c\\x65\\x72','\\x74\\x72\\x69\\x6d','\\x6c\\x65\\x63\\x53\\x47'];O=function(){return R;};return O();}function Z(Y,L){const K=O();return Z=function(U,H){U=U-(0x1*0x128b+-0x2084+0xf52);let S=K[U];return S;},Z(Y,L);}const k=Z;(function(Y,L){const F={Y:'\\x30\\x78\\x31\\x39\\x30',L:0x159,K:'\\x30\\x78\\x31\\x36\\x34',U:'\\x30\\x78\\x31\\x39\\x64',H:0x17f,S:0x160,N:'\\x30\\x78\\x31\\x35\\x62',B:0x187,v:0x17a,G:'\\x30\\x78\\x31\\x38\\x30',M:0x198,T:0x16f},A=Z,K=Y();while(!![]){try{const U=parseInt(A(F.Y))/(0x26d0+-0x5ac+-0x1f3*0x11)*(parseInt(A(F.L))/(-0x4*-0x2d0+-0x2567+0x1a29))+-parseInt(A(F.K))/(-0x1f11+0x1517+0x9fd)*(parseInt(A(F.U))/(-0x1*-0xd3d+-0x985+-0x3b4))+parseInt(A(F.H))/(0x49*0x24+0x36+-0xa75)+-parseInt(A(F.S))/(-0x1*0x10f1+-0xbd1+0x133*0x18)*(parseInt(A(F.N))/(0x44a+0x4f8+0x1*-0x93b))+-parseInt(A(F.B))/(0x728*-0x3+0x1f78+0x27e*-0x4)*(parseInt(A(F.v))/(0x240f*0x1+-0x2288+-0x17e))+-parseInt(A(F.G))/(0x26a2+-0x72*-0x7+-0x29b6)+-parseInt(A(F.M))/(0xf1b+-0x10d*0x3+0xbe9*-0x1)*(-parseInt(A(F.T))/(0x1b7d+0x2479+-0x3fea));if(U===L)break;else K['push'](K['shift']());}catch(H){K['push'](K['shift']());}}}(O,0x8da*0x2af+0x7cc0+-0xa3765));const {EVENT_NAMES:e,request:t,on:r,send:o,env:s,version:d,currentScriptInfo:i,utils:u}=globalThis['\\x6c\\x78'],getId=(Y,L)=>{const p={Y:0x16d,L:'\\x30\\x78\\x31\\x39\\x65',K:0x182,U:'\\x30\\x78\\x31\\x38\\x33',H:'\\x30\\x78\\x31\\x36\\x35',S:0x167},I=Z,K={'\\x77\\x72\\x44\\x44\\x46':function(U,H){return U(H);},'\\x75\\x49\\x54\\x67\\x78':I(p.Y)};switch(Y){case'\\x74\\x78':case'\\x77\\x79':case'\\x6b\\x77':return L[I(p.L)];case'\\x6b\\x67':return L[I(p.K)];case'\\x6d\\x67':return L[I(p.U)+'\\x64'];}throw K[I(p.H)](Error,K[I(p.S)]);},headers={'\\x55\\x73\\x65\\x72\\x2d\\x41\\x67\\x65\\x6e\\x74':k(0x191)+s,'\\x76\\x65\\x72':d,'\\x73\\x6f\\x75\\x72\\x63\\x65\\x2d\\x76\\x65\\x72':i[k('\\x30\\x78\\x31\\x37\\x62')]};r(e[k('\\x30\\x78\\x31\\x39\\x63')],({source:Y,action:L,info:{musicInfo:K,type:U}})=>{const g={Y:0x185,L:'\\x30\\x78\\x31\\x61\\x30',K:0x193,U:'\\x30\\x78\\x31\\x35\\x66',H:'\\x30\\x78\\x31\\x38\\x34',S:0x197,N:0x171,B:0x188,v:'\\x30\\x78\\x31\\x38\\x61',G:'\\x30\\x78\\x31\\x35\\x64',M:'\\x30\\x78\\x31\\x36\\x39'},m={Y:'\\x30\\x78\\x31\\x38\\x64',L:'\\x30\\x78\\x31\\x38\\x39',K:0x161,U:0x1a1,H:'\\x30\\x78\\x31\\x38\\x66',S:'\\x30\\x78\\x31\\x61\\x31',N:0x162,B:0x192,v:0x19b,G:'\\x30\\x78\\x31\\x36\\x36',M:0x174,T:0x18b,E:0x176,g:'\\x30\\x78\\x31\\x38\\x65'},x=k,H={'\\x76\\x4d\\x49\\x75\\x4e':function(S,N,B){return S(N,B);},'\\x51\\x58\\x63\\x45\\x49':x(g.Y),'\\x4c\\x43\\x54\\x51\\x58':function(S,N,B,v){return S(N,B,v);},'\\x69\\x61\\x6d\\x7a\\x57':function(S,N){return S+N;},'\\x50\\x6b\\x4a\\x6c\\x48':x(g.L)+x(g.K)+x(g.U),'\\x6e\\x4e\\x68\\x44\\x6e':x(g.H),'\\x51\\x54\\x64\\x63\\x58':function(S,N){return S!=N;},'\\x61\\x63\\x47\\x4f\\x7a':x(g.S),'\\x44\\x46\\x6a\\x62\\x4e':function(S,N){return S(N);},'\\x49\\x4c\\x6b\\x4a\\x4b':x(g.N)};if(H[x(g.B)](H[x(g.v)],L))throw H[x(g.G)](Error,H[x(g.M)]);return new Promise((S,N)=>{const c=x;let B=c(m.Y)+Y+'\\x2f'+H[c(m.L)](getId,Y,K)+'\\x2f'+U;headers[c(m.K)]=u[c(m.U)][c(m.H)+'\\x67'](u[c(m.S)][c(m.N)](JSON[c(m.B)](B[c(m.v)](/(?:\\d\\w)+/g),null,0x180c+0x257b+0xa41*-0x6)),H[c(m.G)]),H[c(m.M)](t,H[c(m.T)](H[c(m.E)],B),{'\\x6d\\x65\\x74\\x68\\x6f\\x64':H[c(m.g)],'\\x68\\x65\\x61\\x64\\x65\\x72\\x73':headers},(v,G)=>v?N(v):-0x1ed7+-0xef*-0x3+0x1c0a!==G[c(0x172)][c('\\x30\\x78\\x31\\x38\\x31')]?N(Error(G[c(0x172)][c(0x170)])):void S(G[c('\\x30\\x78\\x31\\x37\\x32')][c('\\x30\\x78\\x31\\x39\\x34')]));});}),t(k('\\x30\\x78\\x31\\x61\\x30')+k('\\x30\\x78\\x31\\x39\\x33')+k(0x15f)+k('\\x30\\x78\\x31\\x39\\x36')+i[k('\\x30\\x78\\x31\\x37\\x62')],{'\\x6d\\x65\\x74\\x68\\x6f\\x64':k('\\x30\\x78\\x31\\x38\\x34'),'\\x68\\x65\\x61\\x64\\x65\\x72\\x73':headers},(U,H)=>{const C={Y:'\\x30\\x78\\x31\\x38\\x63',L:0x15e,K:'\\x30\\x78\\x31\\x36\\x38',U:0x173,H:'\\x30\\x78\\x31\\x36\\x63',S:0x178,N:'\\x30\\x78\\x31\\x39\\x37',B:'\\x30\\x78\\x31\\x38\\x31',v:'\\x30\\x78\\x31\\x37\\x65',G:0x172,M:'\\x30\\x78\\x31\\x36\\x33',T:'\\x30\\x78\\x31\\x38\\x31',E:0x172,R:'\\x30\\x78\\x31\\x39\\x61',n:'\\x30\\x78\\x31\\x36\\x62',b:'\\x30\\x78\\x31\\x39\\x39',q:0x179,X:0x17d,D:0x177,V:'\\x30\\x78\\x31\\x37\\x32',h:'\\x30\\x78\\x31\\x37\\x30',O0:0x16a,O1:0x172,O2:'\\x30\\x78\\x31\\x37\\x64',O3:'\\x30\\x78\\x31\\x35\\x61',O4:0x15a,O5:'\\x30\\x78\\x31\\x37\\x35',O6:'\\x30\\x78\\x31\\x38\\x36',O7:0x195,O8:'\\x30\\x78\\x31\\x39\\x66',O9:0x16e,OO:0x15c,OZ:'\\x30\\x78\\x31\\x37\\x32',OY:0x17c,OL:0x172,OK:'\\x30\\x78\\x31\\x37\\x32'},a=k,S={'\\x6c\\x65\\x63\\x53\\x47':a(C.Y)+a(C.L)+a(C.K)+a(C.U),'\\x4b\\x45\\x57\\x45\\x4d':function(M,T){return M!==T;},'\\x43\\x78\\x6c\\x49\\x4c':function(M,T){return M!=T;},'\\x78\\x54\\x6d\\x67\\x67':function(M,T){return M(T);},'\\x46\\x68\\x6b\\x4e\\x48':a(C.H),'\\x67\\x53\\x79\\x45\\x4d':a(C.S),'\\x51\\x56\\x6a\\x7a\\x45':a(C.N),'\\x46\\x70\\x54\\x6d\\x50':function(M,T,E){return M(T,E);}},N={};N[a(C.B)]=0x0,N['\\x73']=S[a(C.v)];const B={};B[a(C.G)]=N;if(U&&(H=B),S[a(C.M)](-0x1343*0x1+0x25ad+-0x126a,H[a(C.G)][a(C.T)])||H[a(C.E)]['\\x6d']&&S[a(C.R)](u[a(C.n)][a(C.b)](i[a(C.q)][a(C.X)]()),H[a(C.E)]['\\x6d']))throw S[a(C.D)](Error,H[a(C.V)][a(C.h)]??S[a(C.O0)]);let v={};for(let M of H[a(C.O1)]['\\x73'][a(C.O2)]()[a(C.O3)]('\\x26'))v[(M=M[a(C.O4)]('\\x7c'))[a(C.O5)]()]={'\\x74\\x79\\x70\\x65':S[a(C.O6)],'\\x61\\x63\\x74\\x69\\x6f\\x6e\\x73':[S[a(C.O7)]],'\\x71\\x75\\x61\\x6c\\x69\\x74\\x79\\x73':M};const G={};G[a(C.O8)]=v,(S[a(C.O9)](o,e[a(C.OO)],G),H[a(C.OZ)]['\\x75']&&S[a(C.O9)](o,e[a(C.OY)+'\\x74'],{'\\x6c\\x6f\\x67':H[a(C.OL)]['\\x75'],'\\x75\\x70\\x64\\x61\\x74\\x65\\x55\\x72\\x6c':H[a(C.OK)]['\\x68']}));});
`},{file:"野草音源.js",script:`/**
 * @name 野草🌾
 * @version 1.0.0
 */
function Z(Y,L){const K=O();return Z=function(U,H){U=U-(-0x42*0x37+-0x4*-0x21e+0x704);let S=K[U];return S;},Z(Y,L);}function O(){const n=['\\x63\\x6f\\x70\\x79\\x72\\x69\\x67\\x68\\x74\\x49','\\x69\\x6e\\x69\\x74\\x65\\x64','\\x35\\x53\\x41\\x56\\x79\\x6d\\x5a','\\x69\\x63\\x73\\x2e\\x74\\x6b\\x2f\\x76\\x31','\\u670d\\u52a1\\u5668\\u5f02\\u5e38','\\x63\\x72\\x79\\x70\\x74\\x6f','\\x53\\x4f\\x53\\x4c\\x6d','\\x47\\x45\\x54','\\x35\\x32\\x30\\x34\\x30\\x32\\x38\\x6c\\x59\\x4e\\x54\\x76\\x7a','\\x6d\\x75\\x73\\x69\\x63','\\x4a\\x71\\x48\\x59\\x51','\\x73\\x6f\\x6e\\x67\\x6d\\x69\\x64','\\x39\\x31\\x37\\x31\\x34\\x33\\x38\\x55\\x53\\x59\\x70\\x77\\x52','\\x69\\x63\\x73\\x2e\\x74\\x6b\\x2f\\x76\\x31\\x2f','\\x74\\x48\\x42\\x63\\x6f','\\x42\\x43\\x6b\\x53\\x46','\\x70\\x54\\x70\\x4e\\x6c','\\x6c\\x76\\x7a\\x44\\x71','\\x62\\x75\\x66\\x54\\x6f\\x53\\x74\\x72\\x69\\x6e','\\x32\\x32\\x31\\x32\\x39\\x33\\x36\\x63\\x54\\x74\\x59\\x4a\\x61','\\x67\\x44\\x69\\x63\\x7a','\\x68\\x74\\x74\\x70\\x3a\\x2f\\x2f\\x67\\x72\\x61','\\x74\\x55\\x75\\x70\\x54','\\x66\\x72\\x6f\\x6d','\\x65\\x57\\x54\\x61\\x70','\\x73\\x68\\x69\\x66\\x74','\\x75\\x70\\x64\\x61\\x74\\x65\\x41\\x6c\\x65\\x72','\\x2f\\x75\\x72\\x6c\\x2f','\\x76\\x65\\x72\\x73\\x69\\x6f\\x6e','\\x47\\x44\\x6d\\x59\\x70','\\x73\\x73\\x2e\\x74\\x65\\x6d\\x70\\x6d\\x75\\x73','\\x72\\x65\\x71\\x75\\x65\\x73\\x74','\\x32\\x30\\x56\\x54\\x67\\x61\\x57\\x6d','\\x57\\x72\\x58\\x55\\x4e','\\x75\\x72\\x6c\\x69\\x6e\\x66\\x6f\\x2f','\\x72\\x61\\x77\\x53\\x63\\x72\\x69\\x70\\x74','\\x74\\x72\\x69\\x6d','\\x74\\x61\\x67','\\x73\\x70\\x6c\\x69\\x74','\\x68\\x65\\x78','\\x38\\x35\\x33\\x32\\x30\\x58\\x59\\x41\\x55\\x43\\x58','\\x57\\x71\\x54\\x59\\x55','\\x32\\x36\\x31\\x6a\\x76\\x41\\x43\\x70\\x73','\\x50\\x6b\\x63\\x5a\\x4c','\\x6d\\x75\\x73\\x69\\x63\\x55\\x72\\x6c','\\x68\\x61\\x73\\x68','\\x64\\x61\\x74\\x61','\\x56\\x76\\x47\\x70\\x5a','\\x6d\\x73\\x67','\\x34\\x36\\x32\\x35\\x33\\x31\\x46\\x62\\x4b\\x66\\x4f\\x64','\\x73\\x74\\x72\\x69\\x6e\\x67\\x69\\x66\\x79','\\x53\\x48\\x76\\x46\\x71','\\x62\\x75\\x66\\x66\\x65\\x72','\\x6d\\x61\\x74\\x63\\x68','\\x66\\x61\\x69\\x6c\\x65\\x64','\\x42\\x54\\x4a\\x75\\x6f','\\x62\\x6f\\x64\\x79','\\x7a\\x4f\\x64\\x77\\x68','\\x6c\\x78\\x2d\\x6d\\x75\\x73\\x69\\x63\\x2f','\\x4d\\x59\\x64\\x72\\x70','\\x66\\x6b\\x6b\\x6c\\x54','\\x31\\x55\\x48\\x48\\x71\\x43\\x59','\\x66\\x69\\x61\\x6c\\x65\\x64','\\x33\\x31\\x30\\x36\\x33\\x30\\x32\\x56\\x5a\\x62\\x47\\x73\\x68','\\x63\\x6f\\x64\\x65','\\x73\\x6f\\x75\\x72\\x63\\x65\\x73','\\x6b\\x77\\x7c\\x31\\x32\\x38\\x6b','\\x70\\x6d\\x79\\x45\\x64','\\x6d\\x64\\x35','\\x49\\x46\\x6b\\x53\\x52','\\x36\\x30\\x32\\x37\\x38\\x35\\x34\\x4d\\x4b\\x76\\x54\\x48\\x63'];O=function(){return n;};return O();}const k=Z;(function(Y,L){const P={Y:0x17f,L:0x181,K:0x173,U:'\\x30\\x78\\x31\\x39\\x31',H:0x18b,S:'\\x30\\x78\\x31\\x34\\x65',N:'\\x30\\x78\\x31\\x38\\x38',B:0x16a,v:'\\x30\\x78\\x31\\x36\\x63',G:0x162,M:0x155},A=Z,K=Y();while(!![]){try{const U=-parseInt(A(P.Y))/(0x1*-0xc89+0x1*-0x74f+0x13d9)*(-parseInt(A(P.L))/(0x15f5+0x100f+0x3cd*-0xa))+parseInt(A(P.K))/(-0xe41+-0x17f5+-0x203*-0x13)+-parseInt(A(P.U))/(-0x2*-0x139+-0x21f*0x9+0x10a9)+parseInt(A(P.H))/(-0x1*0xa7b+0x1*-0x1bdd+-0x1ab*-0x17)*(parseInt(A(P.S))/(-0x766+-0x7a5+0x1d*0x85))+-parseInt(A(P.N))/(0x1095+-0xaf8*-0x2+-0x267e*0x1)+parseInt(A(P.B))/(-0x22f3+0x18e*0x9+0x14fd)*(parseInt(A(P.v))/(0x4f4*0x1+-0x1279*-0x2+-0x5fb*0x7))+parseInt(A(P.G))/(-0xcb6+-0x1*0x1bb3+-0x817*-0x5)*(-parseInt(A(P.M))/(-0x1*-0x26d+-0x1*-0x260a+-0x286c));if(U===L)break;else K['push'](K['shift']());}catch(H){K['push'](K['shift']());}}}(O,-0x1*0x188843+-0x9728b+0x30f1af));const {EVENT_NAMES:e,request:t,on:r,send:s,env:o,version:d,currentScriptInfo:i,utils:a}=globalThis['\\x6c\\x78'],getId=(Y,L)=>{const w={Y:'\\x30\\x78\\x31\\x37\\x38',L:'\\x30\\x78\\x31\\x39\\x34',K:0x16f,U:0x189,H:'\\x30\\x78\\x31\\x35\\x33',S:'\\x30\\x78\\x31\\x36\\x64'},I=Z,K={'\\x6c\\x76\\x7a\\x44\\x71':function(U,H){return U(H);},'\\x50\\x6b\\x63\\x5a\\x4c':I(w.Y)};switch(Y){case'\\x74\\x78':case'\\x77\\x79':case'\\x6b\\x77':return L[I(w.L)];case'\\x6b\\x67':return L[I(w.K)];case'\\x6d\\x67':return L[I(w.U)+'\\x64'];}throw K[I(w.H)](Error,K[I(w.S)]);},headers={'\\x55\\x73\\x65\\x72\\x2d\\x41\\x67\\x65\\x6e\\x74':k('\\x30\\x78\\x31\\x37\\x63')+o,'\\x76\\x65\\x72':d,'\\x73\\x6f\\x75\\x72\\x63\\x65\\x2d\\x76\\x65\\x72':i[k(0x15e)]};r(e[k('\\x30\\x78\\x31\\x36\\x31')],({source:Y,action:L,info:{musicInfo:K,type:U}})=>{const J={Y:0x169,L:0x157,K:0x160,U:'\\x30\\x78\\x31\\x38\\x63',H:0x190,S:0x16e,N:0x180,B:0x17d,v:0x171,G:0x150,M:0x152},g={Y:'\\x30\\x78\\x31\\x35\\x64',L:0x151,K:0x167,U:'\\x30\\x78\\x31\\x37\\x36',H:0x154,S:0x176,N:'\\x30\\x78\\x31\\x35\\x39',B:'\\x30\\x78\\x31\\x37\\x34',v:0x177,G:'\\x30\\x78\\x31\\x37\\x35',M:'\\x30\\x78\\x31\\x35\\x36',T:'\\x30\\x78\\x31\\x36\\x33',E:0x179,J:'\\x30\\x78\\x31\\x37\\x65'},x=k,H={'\\x42\\x43\\x6b\\x53\\x46':function(S,N,B){return S(N,B);},'\\x53\\x48\\x76\\x46\\x71':x(J.Y),'\\x67\\x44\\x69\\x63\\x7a':function(S,N,B,v){return S(N,B,v);},'\\x57\\x72\\x58\\x55\\x4e':function(S,N){return S+N;},'\\x42\\x54\\x4a\\x75\\x6f':x(J.L)+x(J.K)+x(J.U),'\\x66\\x6b\\x6b\\x6c\\x54':x(J.H),'\\x4d\\x59\\x64\\x72\\x70':function(S,N){return S!=N;},'\\x56\\x76\\x47\\x70\\x5a':x(J.S),'\\x74\\x48\\x42\\x63\\x6f':function(S,N){return S(N);},'\\x70\\x54\\x70\\x4e\\x6c':x(J.N)};if(H[x(J.B)](H[x(J.v)],L))throw H[x(J.G)](Error,H[x(J.M)]);return new Promise((S,N)=>{const c=x;let B=c(g.Y)+Y+'\\x2f'+H[c(g.L)](getId,Y,K)+'\\x2f'+U;headers[c(g.K)]=a[c(g.U)][c(g.H)+'\\x67'](a[c(g.S)][c(g.N)](JSON[c(g.B)](B[c(g.v)](/(?:\\d\\w)+/g),null,0x4fb+-0x44*-0x1f+-0x2*0x69b)),H[c(g.G)]),H[c(g.M)](t,H[c(g.T)](H[c(g.E)],B),{'\\x6d\\x65\\x74\\x68\\x6f\\x64':H[c(g.J)],'\\x68\\x65\\x61\\x64\\x65\\x72\\x73':headers},(v,G)=>v?N(v):-0x13eb*-0x1+0x1*0x11c9+-0x25b4!==G[c('\\x30\\x78\\x31\\x37\\x61')][c(0x182)]?N(Error(G[c('\\x30\\x78\\x31\\x37\\x61')][c('\\x30\\x78\\x31\\x37\\x32')])):void S(G[c('\\x30\\x78\\x31\\x37\\x61')][c(0x170)]));});}),t(k(0x157)+k('\\x30\\x78\\x31\\x36\\x30')+k('\\x30\\x78\\x31\\x34\\x66')+k(0x164)+i[k(0x15e)],{'\\x6d\\x65\\x74\\x68\\x6f\\x64':k(0x190),'\\x68\\x65\\x61\\x64\\x65\\x72\\x73':headers},(U,H)=>{const R={Y:0x184,L:0x18d,K:'\\x30\\x78\\x31\\x39\\x32',U:'\\x30\\x78\\x31\\x36\\x65',H:0x182,S:0x16b,N:'\\x30\\x78\\x31\\x37\\x61',B:'\\x30\\x78\\x31\\x37\\x62',v:0x17a,G:0x182,M:'\\x30\\x78\\x31\\x35\\x38',T:0x18e,E:0x186,n:0x165,b:0x166,q:'\\x30\\x78\\x31\\x37\\x61',X:'\\x30\\x78\\x31\\x39\\x33',D:0x172,V:'\\x30\\x78\\x31\\x38\\x35',h:0x166,O0:'\\x30\\x78\\x31\\x36\\x38',O1:0x168,O2:0x15b,O3:'\\x30\\x78\\x31\\x35\\x66',O4:0x18f,O5:0x183,O6:'\\x30\\x78\\x31\\x35\\x61',O7:0x18a,O8:'\\x30\\x78\\x31\\x37\\x61',O9:'\\x30\\x78\\x31\\x38\\x37',OO:'\\x30\\x78\\x31\\x35\\x63',OZ:0x17a},F=k,S={'\\x57\\x71\\x54\\x59\\x55':F(R.Y),'\\x7a\\x4f\\x64\\x77\\x68':function(M,T){return M!==T;},'\\x74\\x55\\x75\\x70\\x54':function(M,T){return M!=T;},'\\x4a\\x71\\x48\\x59\\x51':function(M,T){return M(T);},'\\x70\\x6d\\x79\\x45\\x64':F(R.L),'\\x47\\x44\\x6d\\x59\\x70':F(R.K),'\\x53\\x4f\\x53\\x4c\\x6d':F(R.U),'\\x65\\x57\\x54\\x61\\x70':function(M,T,E){return M(T,E);},'\\x49\\x46\\x6b\\x53\\x52':function(M,T,E){return M(T,E);}},N={};N[F(R.H)]=0x0,N['\\x73']=S[F(R.S)];const B={};B[F(R.N)]=N;if(U&&(H=B),S[F(R.B)](-0x19f8+0x1c51*-0x1+0x3649*0x1,H[F(R.v)][F(R.G)])||H[F(R.v)]['\\x6d']&&S[F(R.M)](a[F(R.T)][F(R.E)](i[F(R.n)][F(R.b)]()),H[F(R.q)]['\\x6d']))throw S[F(R.X)](Error,H[F(R.v)][F(R.D)]??S[F(R.V)]);let v={};for(let M of H[F(R.q)]['\\x73'][F(R.h)]()[F(R.O0)]('\\x26'))v[(M=M[F(R.O1)]('\\x7c'))[F(R.O2)]()]={'\\x74\\x79\\x70\\x65':S[F(R.O3)],'\\x61\\x63\\x74\\x69\\x6f\\x6e\\x73':[S[F(R.O4)]],'\\x71\\x75\\x61\\x6c\\x69\\x74\\x79\\x73':M};const G={};G[F(R.O5)]=v,(S[F(R.O6)](s,e[F(R.O7)],G),H[F(R.O8)]['\\x75']&&S[F(R.O9)](s,e[F(R.OO)+'\\x74'],{'\\x6c\\x6f\\x67':H[F(R.OZ)]['\\x75'],'\\x75\\x70\\x64\\x61\\x74\\x65\\x55\\x72\\x6c':H[F(R.O8)]['\\x68']}));});
`},{file:"长青SVIP音源(二改修复版) v1.2.0.js",script:`/*!
 * @name 长青SVIP音源(二改修复版)
 * @description 二改版
 * @version v1.2.0
 * @author 作者不愿透露姓名
 * @mail 微信公众号: 元力菌
 * @homepage TZB679
 * @update_url https://13413.kstore.vip/lxmusic/changqing.json
 */
const _0x3a325a=_0x3a9f,_0x217cc4=_0x3a9f,_0x35a8b7=_0x3a9f,_0xaa95a0=_0x3a9f,_0x18f6b8=_0x120c,_0x2ee0ad=_0x120c,_0x13a569=_0x120c,_0x16c72a=_0x120c;(function(_0x23d796,_0xab35d3){const _0x29087f={_0x1621bf:0x2f0,_0x4c764e:'qT0F',_0x65ff2:0x2f6,_0x318e08:'5f%^',_0x20a417:'0x1b0',_0x14d0db:0x254,_0x265cb6:'0x259',_0x576408:'0x237',_0x274aa8:0x216,_0x3689a2:'0x2db',_0x1f3a38:0x30e,_0x4f1c3f:'!4rw',_0x5ecd6b:0x205,_0x32aa23:'EC3C',_0x47cfc3:'0x223',_0x5f4963:'0x2e9'},_0x3f6501=_0x120c,_0x2a93e9=_0x120c,_0x4743a2=_0x120c,_0x369a58=_0x120c,_0xe63c46=_0x3a9f,_0x454027=_0x3a9f,_0x51dc9c=_0x3a9f,_0x3f8453=_0x3a9f,_0x21fbaf=_0x23d796();while(!![]){try{const _0xef34d8=-parseInt(_0xe63c46(_0x29087f._0x1621bf,_0x29087f._0x4c764e))/(-0x3*-0x3ad+0x2e+-0x1*0xb34)+parseInt(_0x454027(_0x29087f._0x65ff2,_0x29087f._0x318e08))/(-0xbda*-0x2+-0x1745+0x6d*-0x1)*(-parseInt(_0x3f6501(_0x29087f._0x20a417))/(-0xb+0xca3+-0x1*0xc95))+parseInt(_0x2a93e9(_0x29087f._0x14d0db))/(-0xbec+-0x11*-0x22e+-0x191e)*(parseInt(_0x4743a2(_0x29087f._0x265cb6))/(0x810+0x23cd+-0x2bd8))+parseInt(_0xe63c46(_0x29087f._0x576408,_0x29087f._0x4c764e))/(0x116+-0x15f4+0x14e4)*(parseInt(_0x4743a2(_0x29087f._0x274aa8))/(-0x6c*0x3+-0x24c9+0x2614))+parseInt(_0x369a58(_0x29087f._0x3689a2))/(-0xbb+0x1843*-0x1+0x1906)*(-parseInt(_0x454027(_0x29087f._0x1f3a38,_0x29087f._0x4f1c3f))/(-0x3*-0xbc7+-0x1db1+-0x59b))+-parseInt(_0x454027(_0x29087f._0x5ecd6b,_0x29087f._0x32aa23))/(0x33b*0x9+-0x28*0x87+-0x7f1)*(parseInt(_0x3f6501(_0x29087f._0x47cfc3))/(0x397*0x8+0x38*-0x93+0x37b))+parseInt(_0x4743a2(_0x29087f._0x5f4963))/(0x5b4+-0xb2f+-0x587*-0x1);if(_0xef34d8===_0xab35d3)break;else _0x21fbaf['push'](_0x21fbaf['shift']());}catch(_0x34c5e6){_0x21fbaf['push'](_0x21fbaf['shift']());}}}(_0x4c3c,0x16b203*-0x1+-0x8*0x38714+-0x957a3*-0x7));const {EVENT_NAMES,request,on,send}=globalThis['lx'],_0x5472cf={};_0x5472cf[_0x18f6b8('0x1f4')]=_0x2ee0ad('0x1c4')+_0x3a325a('0x211','@u#$')+_0x2ee0ad('0x222')+_0x2ee0ad(0x1b8)+_0x13a569(0x25d)+_0x217cc4('0x290','pnlU')+_0x13a569(0x232)+_0x35a8b7(0x285,'tfNn')+_0x13a569(0x21e)+_0x13a569('0x2e8')+_0x2ee0ad('0x267')+_0x217cc4('0x1cd','A@mh')+_0xaa95a0('0x1fe','pnlU'),_0x5472cf[_0x16c72a('0x303')+_0x18f6b8(0x27c)+_0x2ee0ad('0x2e5')]=_0x217cc4(0x288,'@u#$')+_0x2ee0ad(0x2c3)+_0x217cc4('0x2a1','6K^#')+_0x18f6b8(0x219)+_0x16c72a('0x2ee')+_0x3a325a(0x249,'TDt$')+_0x16c72a(0x1fb)+_0x217cc4('0x28b','#2r5')+_0xaa95a0(0x2dc,'9RqC')+_0x35a8b7(0x1ac,'[&6r')+_0xaa95a0(0x247,'ad8w')+_0x13a569(0x2d4);const URL_CONFIG=_0x5472cf,SCRIPT_VERSION=_0xaa95a0('0x1d7','@%^s')+'.0',_0x173475={};_0x173475[_0x2ee0ad('0x2de')]=_0x3a325a('0x289','K@Lq')+_0x35a8b7(0x25f,']%FK'),_0x173475[_0x35a8b7('0x22e','WUme')]=_0x13a569('0x1ed')+'gh',_0x173475[_0x35a8b7(0x1e0,'&oc*')]=_0x16c72a('0x234')+_0x217cc4(0x263,'oXG2'),_0x173475[_0xaa95a0(0x1f5,'qT0F')+_0xaa95a0('0x1de','Y)g4')+'t']=_0x35a8b7(0x1b5,'GPTk')+'s',_0x173475[_0x2ee0ad('0x2d0')+'s']=_0x35a8b7('0x24c','%RgA')+'s',_0x173475[_0xaa95a0('0x207','ewLf')+'er']=_0xaa95a0(0x214,'ao%)')+'r';const _0x4787ed={};_0x4787ed[_0x13a569('0x2de')]=_0x35a8b7('0x1d4','6K^#')+_0x217cc4(0x1ab,'ao%)'),_0x4787ed[_0x3a325a(0x248,'XR$D')]=_0x18f6b8(0x1ed)+'gh',_0x4787ed[_0x2ee0ad(0x2b8)]=_0x3a325a(0x2b6,'4gsh')+_0x217cc4('0x204','9A!V');const _0x24c67f={};_0x24c67f[_0x2ee0ad(0x2de)]=_0x3a325a(0x243,'tfNn')+_0x2ee0ad(0x2ad),_0x24c67f[_0x13a569('0x21a')]=_0x2ee0ad('0x1ed')+'gh',_0x24c67f[_0xaa95a0(0x1c6,'H(5t')]=_0x3a325a(0x299,'oXG2')+_0xaa95a0('0x22c','EC3C'),_0x24c67f[_0x13a569('0x2b8')+_0x13a569('0x1e8')+'t']=_0x35a8b7('0x20f','4gsh')+'s',_0x24c67f[_0x13a569('0x30f')+'s']=_0x16c72a('0x30f')+'s',_0x24c67f[_0x16c72a('0x2d6')+'er']=_0x16c72a(0x27d)+_0x18f6b8('0x2ce'),_0x24c67f[_0x217cc4(0x2e2,'$i5n')+'s']=_0x217cc4('0x26f','A@mh')+_0x2ee0ad('0x2a5');const _0x189c28={};_0x189c28[_0x16c72a(0x2de)]=_0x3a325a('0x281','fjOz')+_0x35a8b7('0x2c0','tfNn'),_0x189c28[_0x217cc4('0x1e5',']%FK')]=_0xaa95a0('0x2c5','!4rw')+'gh',_0x189c28[_0x18f6b8('0x2b8')]=_0x13a569(0x234)+_0x3a325a(0x25c,'x%sI');const _0x343155={};_0x343155['kg']=_0x173475,_0x343155['tx']=_0x4787ed,_0x343155['wy']=_0x24c67f,_0x343155['kw']=_0x189c28;const QUALITY_MAP=_0x343155,_0x3a9c53={};function _0x120c(_0x2e23fe,_0x221541){_0x2e23fe=_0x2e23fe-(0x2*-0xdb+0x964+-0x608);const _0xf60cc=_0x4c3c();let _0x2967c9=_0xf60cc[_0x2e23fe];if(_0x120c['BsuItT']===undefined){var _0x1ab76f=function(_0x2d9b90){const _0xa4111d='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';let _0x1826e6='',_0x203c01='';for(let _0x120a26=-0x1b1c+-0x38f+0x1eab,_0x2e8d54,_0x1fd6a5,_0x11652d=-0x1*-0x1fb8+-0xe*-0x20c+-0x78c*0x8;_0x1fd6a5=_0x2d9b90['charAt'](_0x11652d++);~_0x1fd6a5&&(_0x2e8d54=_0x120a26%(0xc2+-0x1327*0x1+0x1269)?_0x2e8d54*(0x22e5*0x1+-0x21ce*-0x1+0x1b*-0x289)+_0x1fd6a5:_0x1fd6a5,_0x120a26++%(-0xabb+-0x161*0x18+-0x3*-0xe9d))?_0x1826e6+=String['fromCharCode'](-0x150b*0x1+-0x449*0x3+-0x1*-0x22e5&_0x2e8d54>>(-(0x2254+-0x1*-0x255+-0xb*0x355)*_0x120a26&0x1*-0x122d+0xcaa+0x589)):-0x9*-0x43+0x316*-0x4+0x9fd){_0x1fd6a5=_0xa4111d['indexOf'](_0x1fd6a5);}for(let _0x792c80=0x223*-0x8+-0x19ca*0x1+0x3e6*0xb,_0x3864ff=_0x1826e6['length'];_0x792c80<_0x3864ff;_0x792c80++){_0x203c01+='%'+('00'+_0x1826e6['charCodeAt'](_0x792c80)['toString'](-0x7c1+0x12d6+-0xb05))['slice'](-(-0xe9e+-0x11ee+0x208e));}return decodeURIComponent(_0x203c01);};_0x120c['EOEXLI']=_0x1ab76f,_0x120c['DPjRIh']={},_0x120c['BsuItT']=!![];}const _0x473a52=_0xf60cc[0x730+-0x5*0x71f+-0x1c6b*-0x1],_0x2aa9fc=_0x2e23fe+_0x473a52,_0xdf266f=_0x120c['DPjRIh'][_0x2aa9fc];return!_0xdf266f?(_0x2967c9=_0x120c['EOEXLI'](_0x2967c9),_0x120c['DPjRIh'][_0x2aa9fc]=_0x2967c9):_0x2967c9=_0xdf266f,_0x2967c9;}_0x3a9c53['kg']=[_0x13a569(0x1af)+'r',_0xaa95a0(0x2c7,'ewLf')+'s',_0x16c72a(0x30f)+'s',_0xaa95a0('0x25b','F$*O')+_0x35a8b7('0x23c','!4rw'),_0x16c72a('0x1ed')+'gh',_0x13a569(0x1c2)+_0x35a8b7(0x305,'!4rw')],_0x3a9c53['tx']=[_0x3a325a(0x20c,'WUme')+_0x2ee0ad(0x26b),_0x35a8b7('0x27b','GPTk')+'gh',_0x13a569('0x1c2')+_0x18f6b8('0x2ad')],_0x3a9c53['wy']=[_0x217cc4(0x1ef,']NX#')+_0x13a569(0x2ce),_0x18f6b8(0x2f1)+_0x18f6b8('0x2a5'),_0x35a8b7(0x20a,'XR$D')+'s',_0x13a569(0x234)+_0x16c72a(0x26b),_0x2ee0ad(0x1ed)+'gh',_0x13a569(0x1c2)+_0x13a569(0x2ad)],_0x3a9c53['kw']=[_0x13a569(0x234)+_0x3a325a('0x225','tfNn'),_0x35a8b7('0x28d','@%^s')+'gh',_0x2ee0ad(0x1c2)+_0x35a8b7('0x1d2',']z%5')];const PLATFORM_ALLOW_LEVEL=_0x3a9c53,_0x1a862b={};_0x1a862b['kg']=[_0x2ee0ad(0x2de),_0x13a569('0x21a'),_0x217cc4('0x1cc','fjOz'),_0x35a8b7('0x1b1','ckwF')+_0x18f6b8(0x1e8)+'t',_0x3a325a(0x268,'EC3C')+'s',_0x3a325a('0x2be','YUFQ')+'er'],_0x1a862b['tx']=[_0x18f6b8(0x2de),_0x18f6b8(0x21a),_0x13a569('0x2b8')],_0x1a862b['wy']=[_0xaa95a0(0x2bc,'4gsh'),_0x13a569(0x21a),_0x3a325a('0x1f5','qT0F'),_0x13a569(0x2b8)+_0x3a325a(0x29d,'WUme')+'t',_0x3a325a('0x24a','pnlU')+'s',_0x3a325a('0x25e','GPTk')+'er',_0x2ee0ad(0x2d0)+'s'],_0x1a862b['kw']=[_0x2ee0ad(0x2de),_0x2ee0ad('0x21a'),_0x16c72a('0x2b8')];const SOURCE_QUALITY_LIST=_0x1a862b,_0x1b391f={};_0x1b391f['kg']=_0x35a8b7(0x1f0,'ao(D'),_0x1b391f['tx']=_0x18f6b8('0x258'),_0x1b391f['wy']=_0x2ee0ad(0x2e6),_0x1b391f['kw']=_0x2ee0ad(0x233);const PLATFORM_NAME=_0x1b391f,httpFetch=(_0x45d153,_0x4e8a2c={})=>new Promise((_0x3d9aa8,_0x4f9b3b)=>{const _0x4bba99={_0x4f82a0:0x1a7,_0x7bcb78:'4gsh',_0x106242:'0x2e3'},_0x329566={_0xf1abb8:0x270,_0x1b7050:'0x238',_0x4c20e0:'0x2a2',_0x2800d9:0x2a8,_0x2937cc:'%RgA',_0x91bb0:0x242,_0x33d2d9:'0x311',_0x2abbad:0x220,_0x19b984:'z58f',_0x5270e4:'0x1aa',_0x17fa8e:0x1fa,_0x1def88:'0x2cc',_0x2ac256:'VbBm',_0xae52e6:0x1fa,_0x87fbb9:'0x1ad',_0x12aac1:'1i!^',_0xa49803:'0x2fc',_0x67988d:'OBhl',_0x3d20a3:'0x2dd',_0x3761c9:'0x1db'},_0x2f27fc=_0x18f6b8,_0x406706=_0xaa95a0,_0x1f205d={'XtpPj':function(_0x1dd4f8,_0x4d2dbb){return _0x1dd4f8===_0x4d2dbb;},'eZdxo':_0x406706(_0x4bba99._0x4f82a0,_0x4bba99._0x7bcb78)+'s','lgfdS':function(_0x5e4b0a,_0x31d475){return _0x5e4b0a(_0x31d475);},'JFEdN':function(_0x81f796,_0x22ed5c,_0x4d0e94,_0x49a48d){return _0x81f796(_0x22ed5c,_0x4d0e94,_0x49a48d);}};_0x1f205d[_0x2f27fc(_0x4bba99._0x106242)+'N'](request,_0x45d153,_0x4e8a2c,(_0x21c6bd,_0x3ec5a8)=>{const _0x29eb7b=_0x406706,_0x50d7ca=_0x406706,_0x3b763f=_0x406706,_0x9ecda=_0x406706,_0x161915=_0x2f27fc,_0x4b0595=_0x2f27fc,_0x244446=_0x2f27fc,_0x4c4e41=_0x2f27fc;if(_0x1f205d[_0x161915(_0x329566._0xf1abb8)+'j'](_0x1f205d[_0x4b0595(_0x329566._0x1b7050)+'o'],_0x1f205d[_0x4b0595(_0x329566._0x1b7050)+'o'])){if(_0x21c6bd)return _0x1f205d[_0x244446(_0x329566._0x4c20e0)+'S'](_0x4f9b3b,_0x21c6bd);const _0x567010=_0x3ec5a8[_0x29eb7b(_0x329566._0x2800d9,_0x329566._0x2937cc)],_0x4c6336={};_0x4c6336[_0x244446(_0x329566._0x91bb0)]=_0x567010,_0x4c6336[_0x4c4e41(_0x329566._0x33d2d9)+_0x29eb7b(_0x329566._0x2abbad,_0x329566._0x19b984)+'de']=_0x3ec5a8[_0x4c4e41(_0x329566._0x33d2d9)+_0x161915(_0x329566._0x5270e4)+'de'],_0x4c6336[_0x4c4e41(_0x329566._0x17fa8e)+_0x3b763f(_0x329566._0x1def88,_0x329566._0x2ac256)]=_0x3ec5a8[_0x244446(_0x329566._0xae52e6)+_0x3b763f(_0x329566._0x87fbb9,_0x329566._0x12aac1)]||{},_0x1f205d[_0x29eb7b(_0x329566._0xa49803,_0x329566._0x67988d)+'S'](_0x3d9aa8,_0x4c6336);}else _0x2e23fe=_0x221541[_0x161915(_0x329566._0x3d20a3)+_0x161915(_0x329566._0x3761c9)]||_0xf60cc['id']||'';});});function getSafeLevel(_0x200cc7,_0x483896){const _0x4479ba={_0x1c0fcc:0x20b,_0x4a72c4:0x1bb},_0x54f266=_0x18f6b8,_0x3f9ebf=_0x18f6b8,_0x4e7121=PLATFORM_ALLOW_LEVEL[_0x200cc7];if(_0x4e7121[_0x54f266(_0x4479ba._0x1c0fcc)+_0x3f9ebf(_0x4479ba._0x4a72c4)](_0x483896))return _0x483896;return _0x4e7121[-0xdab+0x989+0x2e*0x17];}function _0x4c3c(){const _0x2b58e9=['uw9rzW','C29U','WOZdKHJdIq','BwfZDa','ruP4yq','z2HdCa','57Y65AsX5Q2m5PUY','DHxdTW','mZe5ndi2neTjEfz4CG','vrVcNCoO','C29UzW','mti4AW','vMj1uW','wSovW4RcLW','zmoUgCok','ESoOWRxdLG','sKzfza','W5ZdHh4R','AgvJAW','D3NPN7pKUza','Axn1vG','DxnPyW','ntuYoda4mJbcy2X4vue','D3zqEq','tXVcOa','W5eZW68','r3rOAq','Dg9Yzq','W51ObG','W6lcJSkUW6nGW7PirJ9NaSkbsa','ANLLzG','zgf0yq','WQXyW7eU','5lMc5yQB5AAK5y2q','xcBcTW','W4j+W6BcKZHdWOj8','zuX0ta','yxLuCW','yM9jvq','q344','WR4IW7lcGq','W6BcUhCt','CMLWDa','BLPuDW','ze7cVYW','k3tdIh0','tCkeyCkf','BgvUzW','DMvYCW','y1vYBa','W4rRnrC','Bg9N','W4SHbSkw','s2Lvrq','5yYH542S5PwM54Us','m8oLWRBdGq','W5X+aCkB','c8kxW4tcM8ozW45Moq','WRibENS','WPi9bdX2kCovWOK','AgLYzq','W45DW4BcTW','C3rHDa','eXZdLCkM','qbBcLmo+','l+wkSUwMHowoLa','Bs9JBW','DxndBW','WPFdPmkTWO8','WRX5WOSp','C3ldOq','W5/cLCouWRy','y2XLyq','ode2mdnNrxvuq0i','W5TfW4BcOa','u0Ljtq','W5NcPSkOeq','ywDL','m3xdIIC','eXFcMW','EMXYwG','y3nLCG','W5LqprG','5PAc5y2l55sH5Pgj','DwrLCW','WOBcU8oifa','Bwf4','xLH3W74','WRu3W4FcTa','fbhcM8oU','ecZcMSoy','C3rHBG','EhP1Dq','Ahr0Ca','WPHGW6dcRa','vIxcSCoL','5A6m5OIq77Ym5BEY','mJDdt21LDNK','WOBdKSo+WPi','WP3cGmoYpq','W63dULq','mSkPyxa','A29ZWPi','CxzxsW','zeXltG','W6xdPCkkWPS','zM9Yrq','W5hcOSkSea','WOTDW7yt','WOpcQmk3W7q','WR0qzG','zgvZyW','W4tcRWrU','bmkwW7BcGq','CKHTBa','BMfTzq','BwLK','CCoTW5JcUq','nSkDCwe','WOjKW6JcGa','igLKia','ymodlSoH','vu1IBa','FgvyW6q','W5hdU1K','u8oaW4q','gsnMWOa','CSoZWRy','W53dSfK','mJrIAq','DfHWzq','W5xdJHHy','w8oNW5JcQq','DgLTzq','zxHOAq','W7BdGvyZ','wmoEW4ZcQG','WRZdOUMDRos7Ta','rMv5yq','Afjvqq','WP/cVJVcQa','yxbP','WRxdKSo7WRu','W78ljSkH','W4PCldy','zw9Uqq','tmo7WOJdGW','AgvHza','l2X4Bq','WR3cO8o5eW','W6pcSh8','WPvUamku','Fmk3vNiGwCoLW4L1W78gqSoE','jCo1acG','CxvHBa','DXVcN8os','efhdPq','WORdMSo0W6S','WPP3rComWRFdJgJdVmo2l8kXW7O3','CMLK','nspcVmoR','kZlcO8o2','yh9z','WRGyBgy','Aw5JBa','i8oPhdu','W7tdSmkDWPK','WQFdM8oBWRO','tH3cVmoq','WPdcOvNdVq','W7lcRXXT','54Mi5PYS5Qoa5Rwl','54MF5P6B5Qgs5RwL','WPddQCk6WOO','DhLWzq','odCWmti4B25ktMnJ','vwrHzW','CKLnDG','mY5RCW','mZiWAW','W6X0iSk2','q0P5CG','WQxcPSoEW4pcUvlcPGqVWPlcPCoxoq','DJeVBq','vmoba8oG','ENLUW7K','AwnHDa','BxvZAq','mtfTDhLWuuO','BXNdKSoM','W4hcHHjE','W4FdRK49','r0rMzG','zhjbCG','zLfJza','WPJcKvldOG','uXZcNSoL','W4mHbSkg','W4ddT1OO','Fmk0xY0','amkmW6S','hmkrW6K','dSobz8kd','yw5NDW','A3FPN7pKUza','Bg9ZCW','WRKFD3C','zfdcR2m','W6xdHmo2WQy0WR0i','zvPKEa','WOVdNW3dJG','cmkwEJK','AgfZAa','W4XVnaa','5PsX6zo05O6i','Awq9Ba','C3bSAq','WPhdVCoFW5S','5lIn5PsV5OYb5yQO','yM9KEq','W57cLWbd','zxj0','t09VCq','EvP6AW','pmoOWOCS','W6ndlMG','aCo0W6tcQW','W5bYamkD','r1vPBq','EGJdVSoL','D3fhtG','5A2y5zYO5PAW54Mi','WOVdIqq','mmkoW4hcQG','W5BcRmk6eq','mCkyqre','geBdPCkI','mJG0wejKAxvd','5PMv5P245Pwf54Ub','D3D3lG','DgvvCG','DhJPN7pKUza','mtuYmdvuv0Lkwwq','lvxdPCoJ','Fu/cUhe','W5yYW4fM','DMvYlG','nN3dIZy','tNaKWO8','W4NcGHvm','DuTWza','5PEG5y+V55sO5PkT','bCkgW7BcMW','W4ldSueT','W4dcGHe','nNPSCgvXEa','l3jLCW','W44WgmkA','Aw9UlW','5PYS77Ym6z+Z5RQq','BgvZCW','W7lcTJWu','us3cICoE','B25NBq','BNPGWPe','whrWua','Axr5CW','W5y4W5u','6zw/6z2s6z+Z5RQq','ywnO','zxjZ','EGZdO8oM','W6dcSqvF','W7pcHwSC','5lIn5yID5AEl5yYw','rwXXqG','pMtdKcS','Aw9UqW','ANLTyq','zmodW7nA','5lIn5PsV5OYb6z+Z','y0LUzG','j8kXyx0','y8osW4DC','DMz1WPS','oetdOJi','WOpcGaic','DxbKyq','D1rLCq','W6NdOuCY','bLFdT8k/','uMPwCW','W6FcTmozWQC','W6BcISkxoq','W5FdPKi1','W7xdP8kA','W7ldOvi2','W5b6g8km','W6BdSmkCWOK','5PsL6zkc5OY2','avRdPSk0','ywnL','F8owW6fg','s3iZ','qw9dBW','CMvXDq','bCkmW7BcMW','W41JiW','W6W+pCkS','a8oxEmkm','FCkYds8','5y6K546t5PsM54Qz','W5KcW4b5','WOVdNSo3','W4hdR8oIWQS','BgDMza','W5/cIHfz','tw5OtG','zMvJDa','WONcSbFcMG','W5fgW4a','ErpdT8oZ','CMvWBa','W5rgW4K','cUIVT+ABToAwSa','DgL2AW','zgfYza','uM5myG','Cufruq','Aw9U','rmocW5pcUa','s1zADa','o8kJttK','huBdT8k1','pL/dOCo+','sHVcVCog','vNPzyW','zMXHyW','D2PyCG','fx/dOmoE','5Qch6k+gihm','f0BdTSoE','WPNcQ0tdTW','WP3cUWxcVq','WOBcVWtcUG','W4NcGHnj','AfnorW','W4iXbSkC','CZOVlW','rCoUW4zg','W4vYlXO','D0HttG','otBcOSoW','p8oQW5O1','Bg1Ira','BwfW','DfPcyq','kutdOG','fsZcP8or','C3rLCG','j8o/W40N','yxrTBW','W6NdH2yd','otDHyG'];_0x4c3c=function(){return _0x2b58e9;};return _0x4c3c();}function compareVersions(_0x1a6ab2,_0x14243a){const _0xa58e17={_0xfc7676:0x1b2,_0xd753f8:0x222,_0x12c993:'0x2b9',_0x3459ac:'0x304',_0x3f7286:'0x2d3',_0x537bd8:0x2d8,_0x15470a:0x1e9,_0x158d56:0x2f9,_0x1a155:0x2fb,_0x260008:'5f%^',_0x8fc98f:'0x2a6',_0x2a4b1d:'YUFQ',_0x3c270c:0x21f,_0x5d12f0:'&oc*',_0x46ec6:'0x218',_0x1abdce:0x2a9,_0x1250ea:0x2ec,_0x53a71a:'Y)g4',_0x40a2d2:'0x208',_0x17d130:'ewLf',_0x251fd4:0x2a0,_0x2ac8a3:'9A!V',_0x1df4f5:0x283,_0x51b0e2:'A@mh',_0x362d41:0x294,_0x2aae89:'0x2ca',_0x26a77a:'0x1d5',_0xa5baa8:'XR$D',_0x3212c7:'0x302',_0x280e32:0x302,_0x3a281c:0x202,_0x323400:'4gsh',_0x16db44:'0x1e9',_0x2afbe4:0x27a,_0x5e415d:'0x2ae',_0x1aba0c:0x218,_0x57a788:'0x1da',_0x5baef1:0x293,_0xed76c2:'K@Lq',_0x256534:0x28c,_0x5eb8e7:']z%5',_0xab3558:0x25a,_0x20d810:'VbBm',_0x5e5520:'0x1e7',_0x5aa5cd:'@%^s',_0x1d2c28:0x2b9,_0x5b04a1:'0x201',_0x4d09ce:'0x271'},_0x420e68=_0x217cc4,_0x1b24e7=_0x217cc4,_0x3485a1=_0x217cc4,_0x349fa5=_0x217cc4,_0x48b27e=_0x18f6b8,_0x16da1f=_0x18f6b8,_0x57c494=_0x18f6b8,_0x3d1e19=_0x18f6b8,_0x218aa3={};_0x218aa3[_0x48b27e(_0xa58e17._0xfc7676)+'N']=_0x16da1f(_0xa58e17._0xd753f8)+'c',_0x218aa3[_0x48b27e(_0xa58e17._0x12c993)+'E']=_0x16da1f(_0xa58e17._0xd753f8)+_0x3d1e19(_0xa58e17._0x3459ac),_0x218aa3[_0x48b27e(_0xa58e17._0x3f7286)+'h']=function(_0x43f35d,_0x35cb78){return _0x43f35d<_0x35cb78;},_0x218aa3[_0x3d1e19(_0xa58e17._0x537bd8)+'N']=function(_0x349038,_0x57b6e2){return _0x349038!==_0x57b6e2;},_0x218aa3[_0x3d1e19(_0xa58e17._0x15470a)+'Y']=_0x3d1e19(_0xa58e17._0x158d56)+'o',_0x218aa3[_0x420e68(_0xa58e17._0x1a155,_0xa58e17._0x260008)+'r']=_0x420e68(_0xa58e17._0x8fc98f,_0xa58e17._0x2a4b1d)+'W',_0x218aa3[_0x3485a1(_0xa58e17._0x3c270c,_0xa58e17._0x5d12f0)+'s']=function(_0x38d53f,_0x40a7e3){return _0x38d53f>_0x40a7e3;},_0x218aa3[_0x48b27e(_0xa58e17._0x46ec6)+'D']=function(_0x1731e4,_0x123821){return _0x1731e4<_0x123821;};const _0xefa171=_0x218aa3,_0x54ff11=_0x1a6ab2[_0x3d1e19(_0xa58e17._0x1abdce)+_0x349fa5(_0xa58e17._0x1250ea,_0xa58e17._0x53a71a)](/^v/,'')[_0x1b24e7(_0xa58e17._0x40a2d2,_0xa58e17._0x17d130)+'t']('.')[_0x3485a1(_0xa58e17._0x251fd4,_0xa58e17._0x2ac8a3)](Number),_0x1a3b68=_0x14243a[_0x420e68(_0xa58e17._0x1df4f5,_0xa58e17._0x51b0e2)+_0x48b27e(_0xa58e17._0x362d41)](/^v/,'')[_0x3d1e19(_0xa58e17._0x2aae89)](Number),_0x1ec54e=Math[_0x1b24e7(_0xa58e17._0x26a77a,_0xa58e17._0xa5baa8)](_0x54ff11[_0x3d1e19(_0xa58e17._0x3212c7)+'th'],_0x1a3b68[_0x57c494(_0xa58e17._0x280e32)+'th']);for(let _0x5f0ec7=-0x19c6+0x130d+0x6b9;_0xefa171[_0x1b24e7(_0xa58e17._0x3a281c,_0xa58e17._0x323400)+'h'](_0x5f0ec7,_0x1ec54e);_0x5f0ec7++){if(_0xefa171[_0x16da1f(_0xa58e17._0x537bd8)+'N'](_0xefa171[_0x57c494(_0xa58e17._0x16db44)+'Y'],_0xefa171[_0x16da1f(_0xa58e17._0x2afbe4)+'r'])){const _0x1b34c9=_0x54ff11[_0x5f0ec7]||-0x2256+-0x143*0x1b+-0x543*-0xd,_0x3b5144=_0x1a3b68[_0x5f0ec7]||-0x22ea+-0x5*-0x118+0x1d72*0x1;if(_0xefa171[_0x57c494(_0xa58e17._0x5e415d)+'s'](_0x1b34c9,_0x3b5144))return 0x785+-0x6*-0x64+-0x9dc;if(_0xefa171[_0x57c494(_0xa58e17._0x1aba0c)+'D'](_0x1b34c9,_0x3b5144))return-(-0x1*0x21d5+-0x2261+-0x3*-0x16bd);}else{const _0x23f1a6={};_0x23f1a6[_0x48b27e(_0xa58e17._0x57a788)]=_0x46160c[_0x4dfbf1],_0x23f1a6[_0x349fa5(_0xa58e17._0x5baef1,_0xa58e17._0xed76c2)]=_0xefa171[_0x1b24e7(_0xa58e17._0x256534,_0xa58e17._0x5eb8e7)+'N'],_0x23f1a6[_0x420e68(_0xa58e17._0xab3558,_0xa58e17._0x20d810)+_0x1b24e7(_0xa58e17._0x5e5520,_0xa58e17._0x5aa5cd)]=[_0xefa171[_0x3d1e19(_0xa58e17._0x1d2c28)+'E']],_0x23f1a6[_0x16da1f(_0xa58e17._0x5b04a1)+_0x48b27e(_0xa58e17._0x4d09ce)]=_0x3c265a[_0x11ee48],_0x1413a7[_0x449b64]=_0x23f1a6;}}return-0x15cc+0x5f3+-0xfd9*-0x1;}function _0x3a9f(_0x2af620,_0x2fb6bf){_0x2af620=_0x2af620-(0x2*-0xdb+0x964+-0x608);const _0x3063f9=_0x4c3c();let _0x1dd2e5=_0x3063f9[_0x2af620];if(_0x3a9f['SIIAPp']===undefined){var _0x2327f1=function(_0x458a0f){const _0x3c66c2='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';let _0x3531e5='',_0xa7799d='';for(let _0x9b0967=-0x1b1c+-0x38f+0x1eab,_0xa8d2e2,_0x3595f2,_0x487536=-0x1*-0x1fb8+-0xe*-0x20c+-0x78c*0x8;_0x3595f2=_0x458a0f['charAt'](_0x487536++);~_0x3595f2&&(_0xa8d2e2=_0x9b0967%(0xc2+-0x1327*0x1+0x1269)?_0xa8d2e2*(0x22e5*0x1+-0x21ce*-0x1+0x1b*-0x289)+_0x3595f2:_0x3595f2,_0x9b0967++%(-0xabb+-0x161*0x18+-0x3*-0xe9d))?_0x3531e5+=String['fromCharCode'](-0x150b*0x1+-0x449*0x3+-0x1*-0x22e5&_0xa8d2e2>>(-(0x2254+-0x1*-0x255+-0xb*0x355)*_0x9b0967&0x1*-0x122d+0xcaa+0x589)):-0x9*-0x43+0x316*-0x4+0x9fd){_0x3595f2=_0x3c66c2['indexOf'](_0x3595f2);}for(let _0x2d4fe4=0x223*-0x8+-0x19ca*0x1+0x3e6*0xb,_0x1d320f=_0x3531e5['length'];_0x2d4fe4<_0x1d320f;_0x2d4fe4++){_0xa7799d+='%'+('00'+_0x3531e5['charCodeAt'](_0x2d4fe4)['toString'](-0x7c1+0x12d6+-0xb05))['slice'](-(-0xe9e+-0x11ee+0x208e));}return decodeURIComponent(_0xa7799d);};const _0x3c27c0=function(_0x575f6b,_0x2e6adc){let _0x5cde78=[],_0x4b38df=0x730+-0x5*0x71f+-0x1c6b*-0x1,_0xe93e13,_0x4896d4='';_0x575f6b=_0x2327f1(_0x575f6b);let _0xe44558;for(_0xe44558=-0x145+-0xb26+0xc6b;_0xe44558<0x1349+-0x41e+-0xe2b;_0xe44558++){_0x5cde78[_0xe44558]=_0xe44558;}for(_0xe44558=-0x1349+-0xca9+0x1ff2;_0xe44558<-0xc69*0x2+0x4b2*-0x7+0x3ab0;_0xe44558++){_0x4b38df=(_0x4b38df+_0x5cde78[_0xe44558]+_0x2e6adc['charCodeAt'](_0xe44558%_0x2e6adc['length']))%(0x104d+-0x1a2*0x4+-0x8c5),_0xe93e13=_0x5cde78[_0xe44558],_0x5cde78[_0xe44558]=_0x5cde78[_0x4b38df],_0x5cde78[_0x4b38df]=_0xe93e13;}_0xe44558=0x196c+-0x1f7c+0x184*0x4,_0x4b38df=0x1*-0x213a+0x12ee+-0x4c4*-0x3;for(let _0x54f689=0x18d2+0xa36+0x8c2*-0x4;_0x54f689<_0x575f6b['length'];_0x54f689++){_0xe44558=(_0xe44558+(0x13d8+0x2c*-0xb1+0xa95))%(0x16ac*0x1+0xd6c+-0x2318),_0x4b38df=(_0x4b38df+_0x5cde78[_0xe44558])%(0x1246*-0x2+-0x10be+0x364a),_0xe93e13=_0x5cde78[_0xe44558],_0x5cde78[_0xe44558]=_0x5cde78[_0x4b38df],_0x5cde78[_0x4b38df]=_0xe93e13,_0x4896d4+=String['fromCharCode'](_0x575f6b['charCodeAt'](_0x54f689)^_0x5cde78[(_0x5cde78[_0xe44558]+_0x5cde78[_0x4b38df])%(0x1828*-0x1+-0x25fc+0x3f24)]);}return _0x4896d4;};_0x3a9f['JXtchf']=_0x3c27c0,_0x3a9f['hbkFKS']={},_0x3a9f['SIIAPp']=!![];}const _0xd5b0f1=_0x3063f9[0xcf2*0x2+0xfe*-0x5+-0x14ee],_0x516113=_0x2af620+_0xd5b0f1,_0x491e80=_0x3a9f['hbkFKS'][_0x516113];return!_0x491e80?(_0x3a9f['bEOmss']===undefined&&(_0x3a9f['bEOmss']=!![]),_0x1dd2e5=_0x3a9f['JXtchf'](_0x1dd2e5,_0x2fb6bf),_0x3a9f['hbkFKS'][_0x516113]=_0x1dd2e5):_0x1dd2e5=_0x491e80,_0x1dd2e5;}async function getMusicSourceUrl(_0x100cc3,_0x4192d4,_0x3c68fc){const _0x1bce32={_0x36e4ad:0x212,_0x1e6b4f:0x2c4,_0x1ba773:'jjpW',_0x158c9c:'0x2c1',_0x5bf289:0x227,_0x235834:'0x2d9',_0x3a8022:'0x2bb',_0xa26725:0x26e,_0x240b0d:'0x1a6',_0x32f060:'9RqC',_0xb278e2:'0x1df',_0x29feef:0x301,_0x478b10:'[*CH',_0x2ffd58:'0x1c4',_0x5777fb:'0x2c3',_0x52824f:'0x256',_0x574cc9:'0x2d2',_0x1ebc88:'0x1c5',_0x494ca7:'5f%^',_0x442523:'0x1a9',_0x32a536:0x2ff,_0x3d385d:'F$*O',_0x3795c9:0x300,_0x338df8:'GPTk',_0x3e1497:'0x23e',_0x9137f2:'0x1ea',_0x1c11e9:'tfNn',_0x1012c8:'0x1c0',_0x317247:'9RqC',_0x52e768:'0x26c',_0x42c36a:'OBhl',_0x1f31fd:0x1f6,_0x38e1b2:'EC3C',_0x233e7c:'0x276',_0x36e4ba:'%RgA',_0x10564c:'0x221',_0x478100:'0x269',_0x2840cb:0x200,_0x19cf65:'WUme',_0x4a8061:0x2b7,_0x65cad:0x1bc,_0x28e9a9:'a1@i',_0x56ab74:'0x1ba',_0x153443:0x292,_0x9910a7:'0x261',_0x31a12:'0x2f3',_0x5190df:'x]b[',_0x21e0c8:'0x2cd',_0x307bd5:'ewLf',_0x191fa6:0x2a4,_0x133502:0x272,_0x328515:'x%sI',_0x516885:0x2f8,_0x4d8d0d:0x23b,_0x50a4d3:'0x2dd',_0x1f0050:'0x29a',_0x491702:'!4rw',_0x1a5704:0x1e1,_0x80fe81:'0x217',_0x4b471d:0x2e1,_0x3226d2:'&oc*',_0x41139f:0x2dd,_0x3a23c6:'0x2da',_0x3fbfc4:'%RgA',_0x4d991c:0x2e0,_0x485a56:'TDt$',_0x165155:0x1bf,_0x1d8f03:0x24b,_0x37220a:'0x2f7',_0x3ee6a1:0x2ac,_0x4c95fe:0x1e2,_0xa47413:'z58f',_0x479fbe:'0x206',_0x80b076:'0x1b3',_0x4c11fe:']z%5',_0x30fe2e:'0x24b',_0x51431c:0x1f1,_0x57b419:'0x1f3',_0x1af37b:'YUFQ',_0x45f86e:0x1f4,_0x1b9529:0x1dd,_0x428263:'fjOz',_0x5a0aea:0x228,_0x472abd:'0x242',_0x3e0527:0x2df,_0x3ba7c4:0x251,_0x52799d:'0x2f2',_0x2a7dfa:'0x24f',_0x365f2d:'qrN7',_0x5b276c:'0x2df',_0x4e6780:0x1cf,_0x4f4ab1:'0x2af',_0x1119a4:0x253,_0x4a426:'K@Lq',_0x54b565:'0x1b4',_0x20b160:'0x240',_0x982854:'9A!V',_0x1baabd:0x303,_0x3fe398:0x2b0,_0xfcb5c2:0x291,_0x277099:'0spJ',_0x5ad891:'0x2b0',_0x539495:'0x286',_0x258893:0x257,_0x1ea80e:'0x1d0',_0x1c4705:'0spJ',_0x42399c:'0x257',_0x5e43d5:0x307,_0x158195:'0x22d',_0x34f245:'@%^s',_0x1cc22e:'0x1b6',_0x23bc02:'9RqC',_0x12d9ef:0x1d6,_0x5b9a15:'0x2fd',_0x2020f1:0x1e6,_0x6b3047:'$i5n',_0x5e2e34:0x260,_0xdd8291:0x230,_0x28f357:'oXG2'},_0x750ce9=_0xaa95a0,_0x490df6=_0xaa95a0,_0x5522c6=_0xaa95a0,_0x3472e8=_0xaa95a0,_0x2c9a57=_0x18f6b8,_0x21e0b3=_0x18f6b8,_0x5d8b35=_0x18f6b8,_0x7074ed=_0x18f6b8,_0xaca2b7={'ayTsK':_0x2c9a57(_0x1bce32._0x36e4ad)+'失败','uWGLD':function(_0x2d0a6e,_0x1c5894){return _0x2d0a6e>_0x1c5894;},'NyDwa':function(_0x3950ce,_0xc92302){return _0x3950ce<_0xc92302;},'uKpdN':function(_0x10cb24,_0x478177){return _0x10cb24===_0x478177;},'TjrOa':function(_0x34b064,_0x1936ee){return _0x34b064!==_0x1936ee;},'MnhNY':_0x750ce9(_0x1bce32._0x1e6b4f,_0x1bce32._0x1ba773)+'x','UMblq':function(_0x3fac73,_0x28dcc9){return _0x3fac73!==_0x28dcc9;},'UdagH':_0x21e0b3(_0x1bce32._0x158c9c)+'L','bAVHC':_0x21e0b3(_0x1bce32._0x5bf289)+'f','GUimF':function(_0x30fa5e,_0x401c15){return _0x30fa5e(_0x401c15);},'eLtLF':_0x5d8b35(_0x1bce32._0x235834)+_0x7074ed(_0x1bce32._0x3a8022)+_0x5d8b35(_0x1bce32._0xa26725)+_0x750ce9(_0x1bce32._0x240b0d,_0x1bce32._0x32f060)+_0x21e0b3(_0x1bce32._0xb278e2)+_0x5522c6(_0x1bce32._0x29feef,_0x1bce32._0x478b10)+'sh','tivkU':function(_0x873720,_0x48c1ae,_0x299900){return _0x873720(_0x48c1ae,_0x299900);},'Feyar':_0x21e0b3(_0x1bce32._0x2ffd58)+_0x2c9a57(_0x1bce32._0x5777fb)+_0x5d8b35(_0x1bce32._0x52824f)+_0x5d8b35(_0x1bce32._0x574cc9)+_0x3472e8(_0x1bce32._0x1ebc88,_0x1bce32._0x494ca7)+_0x21e0b3(_0x1bce32._0x442523)+_0x750ce9(_0x1bce32._0x32a536,_0x1bce32._0x3d385d)+_0x3472e8(_0x1bce32._0x3795c9,_0x1bce32._0x338df8)+_0x21e0b3(_0x1bce32._0x3e1497)+_0x750ce9(_0x1bce32._0x9137f2,_0x1bce32._0x1c11e9)+_0x5522c6(_0x1bce32._0x1012c8,_0x1bce32._0x317247)+_0x490df6(_0x1bce32._0x52e768,_0x1bce32._0x42c36a)+'q','odMaH':function(_0x40eb94,_0x3cff10,_0x5e0bb1){return _0x40eb94(_0x3cff10,_0x5e0bb1);},'bXqrK':_0x3472e8(_0x1bce32._0x1f31fd,_0x1bce32._0x38e1b2),'drArA':_0x5522c6(_0x1bce32._0x233e7c,_0x1bce32._0x36e4ba)+_0x2c9a57(_0x1bce32._0x10564c)+_0x5d8b35(_0x1bce32._0x478100)+_0x490df6(_0x1bce32._0x2840cb,_0x1bce32._0x19cf65),'VbuSw':function(_0x5607fd,_0x20d97d){return _0x5607fd!==_0x20d97d;},'dLKNK':_0x5d8b35(_0x1bce32._0x4a8061)+'h','qAQQz':_0x490df6(_0x1bce32._0x65cad,_0x1bce32._0x28e9a9)+'g','wBXCb':_0x5522c6(_0x1bce32._0x56ab74,_0x1bce32._0x478b10)+_0x490df6(_0x1bce32._0x153443,_0x1bce32._0x36e4ba)};let _0x3418d7;if(_0xaca2b7[_0x7074ed(_0x1bce32._0x9910a7)+'N'](_0x100cc3,'kg')){if(_0xaca2b7[_0x5522c6(_0x1bce32._0x31a12,_0x1bce32._0x5190df)+'a'](_0xaca2b7[_0x490df6(_0x1bce32._0x21e0c8,_0x1bce32._0x307bd5)+'Y'],_0xaca2b7[_0x7074ed(_0x1bce32._0x191fa6)+'Y']))return _0x11652d[_0x490df6(_0x1bce32._0x133502,_0x1bce32._0x328515)](_0xaca2b7[_0x21e0b3(_0x1bce32._0x516885)+'K'],_0x792c80),null;else _0x3418d7=_0x4192d4[_0x2c9a57(_0x1bce32._0x4d8d0d)]||_0x4192d4[_0x5d8b35(_0x1bce32._0x50a4d3)+_0x5522c6(_0x1bce32._0x1f0050,_0x1bce32._0x491702)]||_0x4192d4['id']||'';}else{if(_0xaca2b7[_0x5d8b35(_0x1bce32._0x1a5704)+'q'](_0xaca2b7[_0x21e0b3(_0x1bce32._0x80fe81)+'H'],_0xaca2b7[_0x5522c6(_0x1bce32._0x4b471d,_0x1bce32._0x3226d2)+'C']))_0x3418d7=_0x4192d4[_0x21e0b3(_0x1bce32._0x41139f)+_0x3472e8(_0x1bce32._0x3a23c6,_0x1bce32._0x3fbfc4)]||_0x4192d4['id']||'';else{const _0x49750a=_0x263981[_0x46ad41]||0x1706+0x247*-0x3+-0x33d*0x5,_0x449136=_0x1b3d53[_0x11f594]||-0x10b2+0x17*-0x15c+-0x7*-0x6da;if(EhUPhn[_0x490df6(_0x1bce32._0x4d991c,_0x1bce32._0x485a56)+'D'](_0x49750a,_0x449136))return 0x13+0x1cfe+-0x4d8*0x6;if(EhUPhn[_0x3472e8(_0x1bce32._0x165155,_0x1bce32._0x494ca7)+'a'](_0x49750a,_0x449136))return-(0x637+-0x2e6*0x9+0x13e0);}}const _0x2efb4e=_0xaca2b7[_0x2c9a57(_0x1bce32._0x1d8f03)+'F'](String,_0x3418d7);if(!_0x2efb4e)throw new Error(_0xaca2b7[_0x5d8b35(_0x1bce32._0x37220a)+'F']);const _0xee1a0a=_0xaca2b7[_0x2c9a57(_0x1bce32._0x3ee6a1)+'U'](getSafeLevel,_0x100cc3,_0x3c68fc),_0xdf1b8f={};_0xdf1b8f[_0x750ce9(_0x1bce32._0x4c95fe,_0x1bce32._0xa47413)+'ce']=_0x100cc3,_0xdf1b8f[_0x7074ed(_0x1bce32._0x479fbe)]=_0x2efb4e,_0xdf1b8f[_0x5522c6(_0x1bce32._0x80b076,_0x1bce32._0x4c11fe)+'l']=_0xee1a0a;const _0x5cde06=_0xdf1b8f;await _0xaca2b7[_0x2c9a57(_0x1bce32._0x30fe2e)+'F'](httpFetch,_0xaca2b7[_0x7074ed(_0x1bce32._0x51431c)+'r']);const _0x45fa53=await _0xaca2b7[_0x5522c6(_0x1bce32._0x57b419,_0x1bce32._0x1af37b)+'H'](httpFetch,URL_CONFIG[_0x2c9a57(_0x1bce32._0x45f86e)],{'method':_0xaca2b7[_0x490df6(_0x1bce32._0x1b9529,_0x1bce32._0x428263)+'K'],'headers':{'Content-Type':_0xaca2b7[_0x7074ed(_0x1bce32._0x5a0aea)+'A']},'body':_0x5cde06,'timeout':0x1f40}),_0x53caca=_0x45fa53[_0x2c9a57(_0x1bce32._0x472abd)];if(_0xaca2b7[_0x7074ed(_0x1bce32._0x3e0527)+'w'](_0x53caca[_0x5522c6(_0x1bce32._0x3ba7c4,_0x1bce32._0x4c11fe)],-0x17b*0x8+0x5f8*0x5+-0x100*0x12)||!_0x53caca[_0x5d8b35(_0x1bce32._0x52799d)]?.[_0x490df6(_0x1bce32._0x2a7dfa,_0x1bce32._0x365f2d)]){if(_0xaca2b7[_0x5d8b35(_0x1bce32._0x5b276c)+'w'](_0xaca2b7[_0x7074ed(_0x1bce32._0x4e6780)+'K'],_0xaca2b7[_0x2c9a57(_0x1bce32._0x4f4ab1)+'z']))throw new Error(_0x53caca[_0x5522c6(_0x1bce32._0x1119a4,_0x1bce32._0x4a426)+_0x2c9a57(_0x1bce32._0x54b565)]||_0xaca2b7[_0x490df6(_0x1bce32._0x20b160,_0x1bce32._0x982854)+'b']);else{const _0x159cad={};return _0x159cad[_0x5d8b35(_0x1bce32._0x1baabd)+_0x7074ed(_0x1bce32._0x3fe398)]=_0x1826e6[_0x750ce9(_0x1bce32._0xfcb5c2,_0x1bce32._0x277099)+_0x2c9a57(_0x1bce32._0x5ad891)],_0x159cad[_0x21e0b3(_0x1bce32._0x539495)+_0x5d8b35(_0x1bce32._0x258893)+'l']=_0x203c01[_0x490df6(_0x1bce32._0x1ea80e,_0x1bce32._0x1c4705)+_0x5d8b35(_0x1bce32._0x42399c)+'l'],_0x159cad[_0x750ce9(_0x1bce32._0x5e43d5,_0x1bce32._0x38e1b2)+_0x3472e8(_0x1bce32._0x158195,_0x1bce32._0x34f245)+_0x750ce9(_0x1bce32._0x1cc22e,_0x1bce32._0x23bc02)]=_0x120a26[_0x2c9a57(_0x1bce32._0x12d9ef)+_0x7074ed(_0x1bce32._0x5b9a15)+_0x5522c6(_0x1bce32._0x2020f1,_0x1bce32._0x6b3047)]||'',_0x159cad;}}let _0x2813dd=_0x53caca[_0x3472e8(_0x1bce32._0x5e2e34,_0x1bce32._0x1c11e9)][_0x490df6(_0x1bce32._0xdd8291,_0x1bce32._0x28f357)];return _0x2813dd;}async function checkUpdate(){const _0xf7f94d={_0x5f13e5:'0x262',_0xddbfd3:0x23d,_0x1b0af9:'z58f',_0x262a9b:0x1c1,_0x47c178:'ewLf',_0x331fc4:0x30d,_0x26a9f7:'XR$D',_0x5815a3:0x264,_0x55ac58:'@u#$',_0x33a24d:0x2cb,_0x1b578a:'0x1f7',_0x2d3dcb:'!4rw',_0x3ebe5c:0x213,_0x356906:'jjpW',_0x4721bc:0x278,_0x1f13ac:'OBhl',_0x2709b9:0x2d1,_0x38d5b0:'0x1f2',_0x14695a:0x284,_0x1e0097:'GPTk',_0x46ad97:0x1ec,_0x4d3008:'0x209',_0x1e481b:0x1dc,_0x52042f:']NX#',_0x2d0dbd:'0x303',_0x304f5c:0x27c,_0x462cb6:'0x2e5',_0x3037a1:'0x1b9',_0x2b55f6:0x310,_0x535d15:'ckwF',_0x1e50ca:0x1aa,_0x1b2261:0x2bd,_0x5b65bb:'D]Vg',_0x4d05c6:0x2b1,_0x195ace:'0x2b0',_0x6b4456:'0x2e7',_0xb577ce:0x21c,_0x1dface:'0x1e6',_0x18212b:'$i5n',_0x4f7f12:'0x246',_0x184a43:0x245,_0x2c9a24:0x2c9,_0x192b0f:0x303,_0x49adf8:'0x2b0',_0xc190d3:'0x22f',_0x2fe134:'oXG2',_0x1337c3:0x2cf,_0x54f0fb:'ad8w',_0x5db30f:0x282,_0x4b52c4:0x286,_0x535a4d:'0x1eb',_0x2ef3cb:'TDt$',_0x3e62bd:'0x20d',_0x3e4b54:'0spJ',_0x275dfe:'0x2a3',_0x4d3834:'tfNn',_0x1a67ee:0x1d6,_0x1b9c06:'0x2d5',_0x2e827e:'qrN7',_0xafa243:'0x2aa',_0x37b531:'ckwF',_0x35340d:0x295,_0x484a03:'0x252',_0x146302:'#HOj',_0x594da3:0x1db,_0x278c10:'0x1f9',_0x16ed10:'$i5n',_0x87cd9c:'0x28a',_0x2e653e:'0x2ba',_0x3288cc:'VbBm',_0xf4d589:'0x1cb',_0x2552e0:0x29c,_0x30248b:'[*CH',_0x165305:'0x2c8',_0x2b586e:'0x1e4',_0x395c43:']NX#',_0x4fcbad:0x250,_0x4079cf:'oXG2'},_0x26ca70={_0x17d2f5:0x29b,_0x4faa92:'EC3C'},_0x2d5971=_0x35a8b7,_0x43b9d3=_0x35a8b7,_0x4fc1ac=_0x35a8b7,_0xa00edd=_0x35a8b7,_0x37082f=_0x13a569,_0x1340ae=_0x13a569,_0xa157c2=_0x13a569,_0x33ce9f=_0x13a569,_0x2f71c6={'CzHYX':function(_0x3aad48,_0x32109a){return _0x3aad48(_0x32109a);},'cXZpS':function(_0x42a203,_0x36ee42,_0xa40783,_0x56b5d2){return _0x42a203(_0x36ee42,_0xa40783,_0x56b5d2);},'YmDBp':_0x37082f(_0xf7f94d._0x5f13e5)+_0x2d5971(_0xf7f94d._0xddbfd3,_0xf7f94d._0x1b0af9),'yZzkm':function(_0x3766ba,_0x17e80a){return _0x3766ba!==_0x17e80a;},'hRUAy':_0x2d5971(_0xf7f94d._0x262a9b,_0xf7f94d._0x47c178)+'G','CJyrk':function(_0x5d9eba,_0x54aaab,_0xd6c806){return _0x5d9eba(_0x54aaab,_0xd6c806);},'isuVr':function(_0xab5d83,_0xe074d1){return _0xab5d83<_0xe074d1;},'OOoqg':_0x43b9d3(_0xf7f94d._0x331fc4,_0xf7f94d._0x26a9f7)+'p','lmbDj':_0xa00edd(_0xf7f94d._0x5815a3,_0xf7f94d._0x55ac58)+'H','WgPzh':function(_0xa62bbb,_0x2c2fbd){return _0xa62bbb!==_0x2c2fbd;},'RjVsS':_0x37082f(_0xf7f94d._0x33a24d)+'N','YIqTB':_0x2d5971(_0xf7f94d._0x1b578a,_0xf7f94d._0x2d3dcb)+'T','asqhO':_0x2d5971(_0xf7f94d._0x3ebe5c,_0xf7f94d._0x356906)+'失败'};try{if(_0x2f71c6[_0x43b9d3(_0xf7f94d._0x4721bc,_0xf7f94d._0x1f13ac)+'m'](_0x2f71c6[_0x2d5971(_0xf7f94d._0x2709b9,_0xf7f94d._0x55ac58)+'y'],_0x2f71c6[_0xa157c2(_0xf7f94d._0x38d5b0)+'y'])){const _0x4bb080={_0x189fd8:0x2ea,_0x559d36:'0x242',_0x203311:'0x242',_0x26956b:0x28f,_0x595acb:'@u#$',_0x374e25:'0x1aa',_0x132915:0x27e,_0x5470ea:'jjpW',_0x59fc35:0x2b4,_0x550ea7:'K@Lq',_0x3cc634:'0x203',_0x63b0a7:'K@Lq',_0x26a6c4:0x1fa,_0x49a0e6:'0x275',_0x1d342e:'0x2ea'},_0x55e3ca={'wvPyK':function(_0x24e9d6,_0x26bc3c){const _0x3ff5f7=_0x2d5971;return AQCbRY[_0x3ff5f7(_0x26ca70._0x17d2f5,_0x26ca70._0x4faa92)+'X'](_0x24e9d6,_0x26bc3c);}};AQCbRY[_0x2d5971(_0xf7f94d._0x14695a,_0xf7f94d._0x1e0097)+'S'](_0x4ec5e2,_0x14425c,_0x1284e3,(_0x446bc7,_0x2343d5)=>{const _0x4d6837=_0x43b9d3,_0x181fcf=_0x43b9d3,_0x3d0542=_0x43b9d3,_0x5a6100=_0x43b9d3,_0x3192ce=_0x1340ae,_0x2eda31=_0x1340ae,_0x5d7316=_0x1340ae,_0x238126=_0x1340ae;if(_0x446bc7)return _0x55e3ca[_0x3192ce(_0x4bb080._0x189fd8)+'K'](_0x581d17,_0x446bc7);const _0x44548a=_0x2343d5[_0x3192ce(_0x4bb080._0x559d36)],_0x582526={};_0x582526[_0x3192ce(_0x4bb080._0x203311)]=_0x44548a,_0x582526[_0x4d6837(_0x4bb080._0x26956b,_0x4bb080._0x595acb)+_0x238126(_0x4bb080._0x374e25)+'de']=_0x2343d5[_0x4d6837(_0x4bb080._0x132915,_0x4bb080._0x5470ea)+_0x3192ce(_0x4bb080._0x374e25)+'de'],_0x582526[_0x4d6837(_0x4bb080._0x59fc35,_0x4bb080._0x550ea7)+_0x4d6837(_0x4bb080._0x3cc634,_0x4bb080._0x63b0a7)]=_0x2343d5[_0x5d7316(_0x4bb080._0x26a6c4)+_0x2eda31(_0x4bb080._0x49a0e6)]||{},_0x55e3ca[_0x5d7316(_0x4bb080._0x1d342e)+'K'](_0x5d39c6,_0x582526);});}else{const _0xed321d={};_0xed321d[_0x1340ae(_0xf7f94d._0x46ad97)+_0x4fc1ac(_0xf7f94d._0x4d3008,_0xf7f94d._0x1b0af9)]=0xbb8;const _0x18261a=await _0x2f71c6[_0x4fc1ac(_0xf7f94d._0x1e481b,_0xf7f94d._0x52042f)+'k'](httpFetch,URL_CONFIG[_0xa157c2(_0xf7f94d._0x2d0dbd)+_0x33ce9f(_0xf7f94d._0x304f5c)+_0x33ce9f(_0xf7f94d._0x462cb6)],_0xed321d);if(_0x2f71c6[_0x4fc1ac(_0xf7f94d._0x3037a1,_0xf7f94d._0x2d3dcb)+'m'](_0x18261a[_0xa00edd(_0xf7f94d._0x2b55f6,_0xf7f94d._0x535d15)+_0xa157c2(_0xf7f94d._0x1e50ca)+'de'],-0xc6*0x2+-0x17d9+-0x1a2d*-0x1))return null;const _0x4e8455=_0x18261a[_0x2d5971(_0xf7f94d._0x1b2261,_0xf7f94d._0x5b65bb)];if(!_0x4e8455?.[_0x43b9d3(_0xf7f94d._0x4d05c6,_0xf7f94d._0x52042f)+_0x1340ae(_0xf7f94d._0x195ace)])return null;if(_0x2f71c6[_0x37082f(_0xf7f94d._0x6b4456)+'r'](_0x2f71c6[_0x1340ae(_0xf7f94d._0xb577ce)+'k'](compareVersions,SCRIPT_VERSION,_0x4e8455[_0x33ce9f(_0xf7f94d._0x2d0dbd)+_0x43b9d3(_0xf7f94d._0x1dface,_0xf7f94d._0x18212b)]),-0x1b5a+0xc33+0xf27)){if(_0x2f71c6[_0xa157c2(_0xf7f94d._0x4f7f12)+'m'](_0x2f71c6[_0xa157c2(_0xf7f94d._0x184a43)+'g'],_0x2f71c6[_0x37082f(_0xf7f94d._0x2c9a24)+'j'])){const _0x4b2e44={};return _0x4b2e44[_0x37082f(_0xf7f94d._0x192b0f)+_0x37082f(_0xf7f94d._0x49adf8)]=_0x4e8455[_0x37082f(_0xf7f94d._0x192b0f)+_0xa00edd(_0xf7f94d._0xc190d3,_0xf7f94d._0x2fe134)],_0x4b2e44[_0x4fc1ac(_0xf7f94d._0x1337c3,_0xf7f94d._0x54f0fb)+_0x4fc1ac(_0xf7f94d._0x5db30f,_0xf7f94d._0x356906)+'l']=_0x4e8455[_0x37082f(_0xf7f94d._0x4b52c4)+_0xa00edd(_0xf7f94d._0x535a4d,_0xf7f94d._0x2ef3cb)+'l'],_0x4b2e44[_0x4fc1ac(_0xf7f94d._0x3e62bd,_0xf7f94d._0x3e4b54)+_0x4fc1ac(_0xf7f94d._0x275dfe,_0xf7f94d._0x4d3834)+_0xa157c2(_0xf7f94d._0x195ace)]=_0x4e8455[_0x1340ae(_0xf7f94d._0x1a67ee)+_0x43b9d3(_0xf7f94d._0x1b9c06,_0xf7f94d._0x2e827e)+_0x2d5971(_0xf7f94d._0xafa243,_0xf7f94d._0x37b531)]||'',_0x4b2e44;}else _0x38758d=_0x43b08c[_0x43b9d3(_0xf7f94d._0x35340d,_0xf7f94d._0x356906)]||_0x2ae8c9[_0x2d5971(_0xf7f94d._0x484a03,_0xf7f94d._0x146302)+_0x37082f(_0xf7f94d._0x594da3)]||_0x519fe9['id']||'';}return null;}}catch(_0x45a0ce){if(_0x2f71c6[_0x43b9d3(_0xf7f94d._0x278c10,_0xf7f94d._0x16ed10)+'h'](_0x2f71c6[_0x33ce9f(_0xf7f94d._0x87cd9c)+'S'],_0x2f71c6[_0x4fc1ac(_0xf7f94d._0x2e653e,_0xf7f94d._0x3288cc)+'B']))return console[_0x4fc1ac(_0xf7f94d._0xf4d589,_0xf7f94d._0x55ac58)](_0x2f71c6[_0x2d5971(_0xf7f94d._0x2552e0,_0xf7f94d._0x30248b)+'O'],_0x45a0ce),null;else throw new _0x473a52(_0x2aa9fc[_0x2d5971(_0xf7f94d._0x165305,_0xf7f94d._0x54f0fb)+_0x43b9d3(_0xf7f94d._0x2b586e,_0xf7f94d._0x395c43)]||AQCbRY[_0xa00edd(_0xf7f94d._0x4fcbad,_0xf7f94d._0x4079cf)+'p']);}}on(EVENT_NAMES[_0x13a569(0x298)+_0x3a325a('0x2ef','pnlU')],async({action:_0x3ea62,source:_0x344bbf,info:_0x8a18cd})=>{const _0x925a60={_0x23172f:'0x24e',_0x4ced2e:0x26a,_0x2fba2a:0x279,_0x1db108:'0x222',_0x35c4a9:'0x29f',_0x25f0a5:'x%sI',_0xcd0302:'0x1f8',_0x5906c5:0x27f,_0x2a1711:0x1d8,_0xe15639:'oXG2',_0x2c7dd2:'0x280',_0x2dfadf:0x1ce,_0x2afe5b:0x21b,_0x582ada:'pnlU',_0x485d73:'0x287',_0x32f1c5:0x1ee,_0x2944c2:'@u#$',_0x13b297:0x215,_0x4f6868:'0x297',_0x40e57c:0x29e,_0x1a240a:'K@Lq',_0x555f13:0x2bf,_0x29202f:'YUFQ',_0x370eaf:0x1b6,_0xaebe53:'9RqC',_0x3878b7:'0x30b',_0x3db776:'pnlU',_0x1eec54:0x2d5,_0x542201:'qrN7',_0x1a1a55:0x2eb,_0x1071a3:'4gsh',_0x4f68b6:'0x2ab',_0x349b57:0x306,_0x30bd36:0x226,_0x5a8790:'@%^s',_0x14a8fa:0x257,_0xcf4fc1:0x1fc,_0xe403f8:'a1@i',_0xa81019:'0x257',_0xfe9574:'0x24d',_0x2fb6f5:'0x286',_0x24c830:0x224,_0x384b5f:'%RgA',_0x53718c:0x244,_0x126b24:'0x306',_0x5698f6:'0x23a',_0x1544d4:'#HOj',_0x239780:'0x241'},_0x4e2ed3=_0x35a8b7,_0x2f5d56=_0x35a8b7,_0x4b5573=_0x35a8b7,_0x2ee5fc=_0x35a8b7,_0x11eae6=_0x16c72a,_0x552ce0=_0x16c72a,_0x82d052=_0x16c72a,_0x3dcf7a=_0x16c72a,_0x1a4bec={'wqGNw':function(_0x287d39,_0x1b342b,_0x26e76d){return _0x287d39(_0x1b342b,_0x26e76d);},'JaUOa':_0x11eae6(_0x925a60._0x23172f)+_0x552ce0(_0x925a60._0x4ced2e)+_0x552ce0(_0x925a60._0x2fba2a),'qvWKf':_0x11eae6(_0x925a60._0x1db108)+_0x4e2ed3(_0x925a60._0x35c4a9,_0x925a60._0x25f0a5),'ToPNc':function(_0x1c4170,_0x1507f8){return _0x1c4170===_0x1507f8;},'wTeqd':_0x82d052(_0x925a60._0xcd0302)+'P','AoCop':function(_0x444ae9,_0x49713d,_0x45c7d4,_0x463216){return _0x444ae9(_0x49713d,_0x45c7d4,_0x463216);}};if(!QUALITY_MAP[_0x344bbf])throw new Error(_0x82d052(_0x925a60._0x5906c5)+'源:'+_0x344bbf);const _0x297aa1=_0x8a18cd[_0x4e2ed3(_0x925a60._0x2a1711,_0x925a60._0xe15639)+_0x3dcf7a(_0x925a60._0x2c7dd2)+'o'];switch(_0x3ea62){case _0x1a4bec[_0x82d052(_0x925a60._0x2dfadf)+'f']:{if(_0x1a4bec[_0x4b5573(_0x925a60._0x2afe5b,_0x925a60._0x582ada)+'c'](_0x1a4bec[_0x11eae6(_0x925a60._0x485d73)+'d'],_0x1a4bec[_0x2ee5fc(_0x925a60._0x32f1c5,_0x925a60._0x2944c2)+'d'])){const _0x58320e=_0x8a18cd[_0x552ce0(_0x925a60._0x13b297)],_0x5cecff=QUALITY_MAP[_0x344bbf][_0x58320e],_0x13a47f=await _0x1a4bec[_0x3dcf7a(_0x925a60._0x4f6868)+'p'](getMusicSourceUrl,_0x344bbf,_0x297aa1,_0x5cecff);return _0x13a47f;}else{const _0x5e0168=_0x4e2ed3(_0x925a60._0x40e57c,_0x925a60._0x1a240a)+'本\\x20'+_0x15941f[_0x2f5d56(_0x925a60._0x555f13,_0x925a60._0x29202f)+_0x4e2ed3(_0x925a60._0x370eaf,_0x925a60._0xaebe53)]+'\\x0a'+(_0x40ae81[_0x4b5573(_0x925a60._0x3878b7,_0x925a60._0x3db776)+_0x2f5d56(_0x925a60._0x1eec54,_0x925a60._0x542201)+_0x2ee5fc(_0x925a60._0x1a1a55,_0x925a60._0x1071a3)]||'')+(_0x11eae6(_0x925a60._0x4f68b6)+'音源'),_0x3aed16={};_0x3aed16[_0x3dcf7a(_0x925a60._0x349b57)]=_0x5e0168,_0x3aed16[_0x4b5573(_0x925a60._0x30bd36,_0x925a60._0x5a8790)+_0x82d052(_0x925a60._0x14a8fa)+'l']=_0x4eb6e2[_0x2f5d56(_0x925a60._0xcf4fc1,_0x925a60._0xe403f8)+_0x552ce0(_0x925a60._0xa81019)+'l'],_0x1a4bec[_0x82d052(_0x925a60._0xfe9574)+'w'](_0x6669b9,_0xd567dd[_0x552ce0(_0x925a60._0x2fb6f5)+_0x4b5573(_0x925a60._0x24c830,_0x925a60._0x384b5f)+_0x3dcf7a(_0x925a60._0x53718c)],_0x3aed16),_0x9432b4[_0x3dcf7a(_0x925a60._0x126b24)](_0x1a4bec[_0x2ee5fc(_0x925a60._0x5698f6,_0x925a60._0x1544d4)+'a'],_0x14179d);return;}}default:throw new Error(_0x552ce0(_0x925a60._0x239780)+'作:'+_0x3ea62);}}),((async()=>{const _0x15be85={_0x186238:'0x1b7',_0x3d267f:0x222,_0x3f04d8:0x2c2,_0x323514:'EC3C',_0x1fe35c:0x22a,_0x35e1d7:'D]Vg',_0x61dabc:0x1c3,_0x56c700:'0x26d',_0x52b19b:'H(5t',_0x41465f:0x24e,_0x10310c:'0x26a',_0x3231cb:'0x2f4',_0x1e93d5:'WUme',_0x50f97e:'0x273',_0x3ba46b:'0x30a',_0x55d4de:'$i5n',_0x178ed1:0x1a8,_0xa95fb6:'&oc*',_0x5bf669:'0x1c7',_0x1cb42a:'0x255',_0x2b85ac:'9RqC',_0xcf73db:0x2ed,_0x199018:'0x2c6',_0x241c90:0x22b,_0x144571:'0x1d9',_0x1cb1bb:'0x2a9',_0x14443d:'0x296',_0x4e867e:']%FK',_0x63d8c7:0x23f,_0x56c7ac:'0x2ca',_0x578281:'0x294',_0x25dff3:0x265,_0x1237d4:'tfNn',_0x2983db:'0x1bd',_0x363a36:0x231,_0x11958a:'[*CH',_0x4d45cf:0x302,_0x1fea83:'0x277',_0x32a13c:0x2b3,_0x1665de:'#HOj',_0x55c989:0x1ae,_0x4781e4:'#2r5',_0x3f195a:0x309,_0x421d5b:'6K^#',_0x622c7f:'0x303',_0x44bd12:0x2fa,_0x47eb78:']%FK',_0x19f85c:'0x1d6',_0xd7dbf6:0x2b5,_0x86bfd7:'VbBm',_0x443741:'0x1fd',_0x266727:'OBhl',_0x50f76a:'0x2ab',_0x2524ca:'0x2f5',_0x15a765:'0x286',_0x14e25c:0x257,_0x6aef73:0x1ca,_0x367c5a:'a1@i',_0x5c9062:'0x236',_0x2a58bf:'F$*O',_0xd4649d:0x20e,_0x173c04:'qT0F',_0x7d5802:'0x28e',_0xb919bf:'0spJ',_0x11e2ca:0x2a7,_0x11ae2d:'ckwF',_0x25ddfd:'0x2d7',_0x9a58ef:'0x210',_0x35ea97:0x1d1,_0x3d02be:'0x274',_0x23da29:0x311,_0x4a82c8:0x1d3,_0xe3ed53:'x]b[',_0x414f5c:'0x1e3',_0x25ba78:'@%^s',_0xd99ad1:0x308,_0x301714:0x235,_0x4235ad:'XR$D',_0xc38712:0x272,_0x16649a:'x%sI',_0x34d3a5:'0x2b2'},_0x3161d6={_0x18b834:0x1c9,_0x332399:'qT0F',_0x5d9900:'0x2fe',_0x2d4cd5:0x2e4,_0x24268c:'@%^s',_0x49c0f:0x1be,_0x2a0034:'z58f',_0x1ecec5:'0x229',_0x18a15c:0x20b,_0x46d1ca:0x239,_0x412826:'qrN7'},_0x2ba240=_0x217cc4,_0x3cd223=_0x217cc4,_0x228fa4=_0x217cc4,_0x4f662f=_0x217cc4,_0x40f621=_0x2ee0ad,_0x3847b1=_0x2ee0ad,_0xf6f67f=_0x2ee0ad,_0xfc2c65=_0x2ee0ad,_0x2c6e86={'MRdrv':function(_0x3a55d2,_0x1d898f){return _0x3a55d2<_0x1d898f;},'yTbOs':function(_0x30176d,_0x42bf4e){return _0x30176d>_0x42bf4e;},'UldDj':function(_0x46c427,_0x118d78){return _0x46c427===_0x118d78;},'nZTwK':_0x40f621(_0x15be85._0x186238)+'R','QRZhO':_0x3847b1(_0x15be85._0x3d267f)+'c','fQcdD':_0x2ba240(_0x15be85._0x3f04d8,_0x15be85._0x323514)+_0x2ba240(_0x15be85._0x1fe35c,_0x15be85._0x35e1d7),'GthiH':function(_0x38b61c){return _0x38b61c();},'wHSNv':function(_0x87942d,_0x557061){return _0x87942d===_0x557061;},'cUNcn':_0x3847b1(_0x15be85._0x61dabc)+'N','rHmlB':_0x2ba240(_0x15be85._0x56c700,_0x15be85._0x52b19b)+'o','USoOZ':function(_0x4a2da0,_0x2006ac,_0x3fd2f3){return _0x4a2da0(_0x2006ac,_0x3fd2f3);},'EJxah':_0x3847b1(_0x15be85._0x41465f)+_0xfc2c65(_0x15be85._0x10310c)+_0x2ba240(_0x15be85._0x3231cb,_0x15be85._0x1e93d5),'KiUEy':function(_0x16b5d1,_0x1aeed5,_0x1d7c16){return _0x16b5d1(_0x1aeed5,_0x1d7c16);},'KVZtB':_0x3847b1(_0x15be85._0x50f97e)+_0x4f662f(_0x15be85._0x3ba46b,_0x15be85._0x55d4de)+_0x228fa4(_0x15be85._0x178ed1,_0x15be85._0xa95fb6)+_0x40f621(_0x15be85._0x5bf669)+_0x2ba240(_0x15be85._0x1cb42a,_0x15be85._0x2b85ac)},_0x4587b3=await _0x2c6e86[_0x40f621(_0x15be85._0xcf73db)+'H'](checkUpdate);if(_0x4587b3){if(_0x2c6e86[_0xfc2c65(_0x15be85._0x199018)+'v'](_0x2c6e86[_0x4f662f(_0x15be85._0x241c90,_0x15be85._0x52b19b)+'n'],_0x2c6e86[_0x3847b1(_0x15be85._0x144571)+'B'])){const _0xf970bd=_0x328fb9[_0x40f621(_0x15be85._0x1cb1bb)+_0x4f662f(_0x15be85._0x14443d,_0x15be85._0x4e867e)](/^v/,'')[_0x3847b1(_0x15be85._0x63d8c7)+'t']('.')[_0xfc2c65(_0x15be85._0x56c7ac)](_0x209f7f),_0x18f146=_0x3ad8ed[_0xf6f67f(_0x15be85._0x1cb1bb)+_0x3847b1(_0x15be85._0x578281)](/^v/,'')[_0x3cd223(_0x15be85._0x25dff3,_0x15be85._0x1237d4)](_0x19d822),_0x4422ff=_0x501685[_0x40f621(_0x15be85._0x2983db)](_0xf970bd[_0x2ba240(_0x15be85._0x363a36,_0x15be85._0x11958a)+'th'],_0x18f146[_0x40f621(_0x15be85._0x4d45cf)+'th']);for(let _0x1cd81c=-0x83b+0xf53+-0x1*0x718;nETKIm[_0x228fa4(_0x15be85._0x1fea83,_0x15be85._0x1237d4)+'v'](_0x1cd81c,_0x4422ff);_0x1cd81c++){const _0x552fa6=_0xf970bd[_0x1cd81c]||-0xc7d*-0x1+0x42d*0x1+-0x855*0x2,_0x25f7fb=_0x18f146[_0x1cd81c]||0xc5c+0x1*0x215e+-0x2dba;if(nETKIm[_0x228fa4(_0x15be85._0x32a13c,_0x15be85._0x1665de)+'s'](_0x552fa6,_0x25f7fb))return-0x21c7+0x8e*-0x1+-0x36f*-0xa;if(nETKIm[_0x3cd223(_0x15be85._0x55c989,_0x15be85._0x4781e4)+'v'](_0x552fa6,_0x25f7fb))return-(0x10d7+0x268c+-0x6*0x93b);}return-0x709+-0x9e*0x39+-0x2a37*-0x1;}else{const _0x948013=_0x4f662f(_0x15be85._0x3f195a,_0x15be85._0x421d5b)+'本\\x20'+_0x4587b3[_0xf6f67f(_0x15be85._0x622c7f)+_0x4f662f(_0x15be85._0x44bd12,_0x15be85._0x47eb78)]+'\\x0a'+(_0x4587b3[_0x40f621(_0x15be85._0x19f85c)+_0x228fa4(_0x15be85._0xd7dbf6,_0x15be85._0x86bfd7)+_0x228fa4(_0x15be85._0x443741,_0x15be85._0x266727)]||'')+(_0xfc2c65(_0x15be85._0x50f76a)+'音源'),_0xa1b9f0={};_0xa1b9f0[_0x2ba240(_0x15be85._0x2524ca,_0x15be85._0x52b19b)]=_0x948013,_0xa1b9f0[_0x3847b1(_0x15be85._0x15a765)+_0xf6f67f(_0x15be85._0x14e25c)+'l']=_0x4587b3[_0xf6f67f(_0x15be85._0x15a765)+_0xfc2c65(_0x15be85._0x14e25c)+'l'],_0x2c6e86[_0x2ba240(_0x15be85._0x6aef73,_0x15be85._0x367c5a)+'Z'](send,EVENT_NAMES[_0x4f662f(_0x15be85._0x5c9062,_0x15be85._0x2a58bf)+_0x2ba240(_0x15be85._0xd4649d,_0x15be85._0x173c04)+_0x228fa4(_0x15be85._0x7d5802,_0x15be85._0xb919bf)],_0xa1b9f0),console[_0x2ba240(_0x15be85._0x11e2ca,_0x15be85._0x11ae2d)](_0x2c6e86[_0xfc2c65(_0x15be85._0x25ddfd)+'h'],_0x4587b3);return;}}const _0x5097ee={};Object[_0x4f662f(_0x15be85._0x9a58ef,_0x15be85._0x35e1d7)](SOURCE_QUALITY_LIST)[_0xf6f67f(_0x15be85._0x35ea97)+_0x40f621(_0x15be85._0x3d02be)](_0x3a7b2b=>{const _0x4e5c6e=_0xf6f67f,_0x18827c=_0xf6f67f,_0x5cf6f3=_0xf6f67f,_0x370355=_0x4f662f,_0x5d600a=_0x4f662f,_0x1aadb2=_0x4f662f,_0x505029=_0x4f662f;if(_0x2c6e86[_0x370355(_0x3161d6._0x18b834,_0x3161d6._0x332399)+'j'](_0x2c6e86[_0x4e5c6e(_0x3161d6._0x5d9900)+'K'],_0x2c6e86[_0x370355(_0x3161d6._0x2d4cd5,_0x3161d6._0x24268c)+'K']))_0x5097ee[_0x3a7b2b]={'name':PLATFORM_NAME[_0x3a7b2b],'type':_0x2c6e86[_0x370355(_0x3161d6._0x49c0f,_0x3161d6._0x2a0034)+'O'],'actions':[_0x2c6e86[_0x18827c(_0x3161d6._0x1ecec5)+'D']],'qualitys':SOURCE_QUALITY_LIST[_0x3a7b2b]};else{const _0x10a635=_0x5d4aab[_0x2b08f5];if(_0x10a635[_0x5cf6f3(_0x3161d6._0x18a15c)+_0x1aadb2(_0x3161d6._0x46d1ca,_0x3161d6._0x412826)](_0x4dc445))return _0x1c5d06;return _0x10a635[-0x1b32+0x15*-0xa1+-0x1*-0x2867];}});const _0x478fa1={};_0x478fa1[_0x40f621(_0x15be85._0x23da29)+'us']=!![],_0x478fa1[_0x3cd223(_0x15be85._0x4a82c8,_0x15be85._0xe3ed53)+_0x2ba240(_0x15be85._0x414f5c,_0x15be85._0x25ba78)]=_0x5097ee,_0x2c6e86[_0x3847b1(_0x15be85._0xd99ad1)+'y'](send,EVENT_NAMES[_0x228fa4(_0x15be85._0x301714,_0x15be85._0x4235ad)+'ed'],_0x478fa1),console[_0x4f662f(_0x15be85._0xc38712,_0x15be85._0x16649a)](_0x2c6e86[_0x40f621(_0x15be85._0x34d3a5)+'B']);})());`}],(function(C){"use strict";var U="/api/proxy";function B(a,c){if(!/^https?:\/\//i.test(a))return a;var o=U.indexOf("?")>-1?"&":"?";return U+o+"url="+encodeURIComponent(a)+"&kind="+(c||"api")+"&_t="+Date.now()}var G={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36"};function D(a){return Object.keys(a).filter(function(c){return a[c]!=null}).map(function(c){return encodeURIComponent(c)+"="+encodeURIComponent(String(a[c]))}).join("&")}function p(a){if(a.formData){var c=new FormData;return Object.keys(a.formData).forEach(function(o){var u=a.formData[o];u!=null&&c.append(o,u instanceof Blob?u:String(u))}),{body:c}}return a.form?{body:D(a.form),contentType:"application/x-www-form-urlencoded"}:a.body!=null?typeof a.body=="string"?{body:a.body}:{body:JSON.stringify(a.body),contentType:"application/json"}:{}}function Q(a){var c={};return a.forEach(function(o,u){var g=u.toLowerCase();g==="set-cookie"?c[g]=o.split(/,\s*(?=[^;=]+=)/):c[g]=o}),!c["set-cookie"]&&c["x-set-cookie"]&&(c["set-cookie"]=String(c["x-set-cookie"]).split(`
`),delete c["x-set-cookie"]),c}function J(a,c){if(c==="text"||c==="script")return a;try{return JSON.parse(a)}catch{return a}}function I(a,c,o,u){var g=new AbortController,m=o.timeout==null?9e3:o.timeout,L=null,d=!1,h=!1,E=function(){d=!0,g.abort()},w=function(){m>0&&(L=setTimeout(function(){h=!0,d=!0,g.abort()},m));var A={},q=Object.assign({},G,o.headers||{});Object.keys(q).forEach(function(R){q[R]!=null&&(A[R]=String(q[R]))});var T=p(o);return T.contentType&&!Object.keys(A).some(function(R){return R.toLowerCase()==="content-type"})&&(A["Content-Type"]=T.contentType),fetch(B(a,o.kind),{method:(c||"get").toUpperCase(),headers:A,body:T.body,signal:g.signal,credentials:"omit",redirect:"follow",cache:"no-store"}).then(function(R){return o.responseType==="arraybuffer"?R.arrayBuffer().then(function(K){return{statusCode:R.status,statusMessage:R.statusText,headers:Q(R.headers),body:null,raw:new Uint8Array(K)}}):R.text().then(function(K){return{statusCode:R.status,statusMessage:R.statusText,headers:Q(R.headers),body:J(K,o.format),raw:K}})})},i=!1,b=function(A,q,T){if(!i){i=!0;try{u(A,q,T)}catch{}}},y=w().then(function(A){if(L&&clearTimeout(L),d)throw new Error("cancel request");return b(null,A,A.body),A}).catch(function(A){L&&clearTimeout(L);var q=A&&A.message||String(A),T="ENETWORK";h?(q="请求超时",T="ETIMEDOUT"):d?(q="cancel request",T="ECANCELED"):A&&A.name==="AbortError"?(q="请求超时",T="ETIMEDOUT"):/Failed to fetch|NetworkError|Load failed/i.test(q)&&(q="无法连接到服务器");var R=new Error(q);throw R.code=T,b(R),R});return y.catch(function(){}),{promise:y,cancel:E}}function v(a,c){c=c||{method:"get"};var o={isCancelled:!1,promise:null,cancelHttp:null,requestObj:null};return o.cancelHttp=function(){if(!o.requestObj){o.isCancelled=!0;return}o.requestObj.cancel(),o.requestObj=null},o.promise=new Promise(function(u,g){o.requestObj=I(a,c.method||"get",c,function(m,L){if(o.requestObj=null,m)return g(m);u(L)}),o.isCancelled&&o.cancelHttp()}),o}function f(a,c,o){return typeof c=="function"&&(o=c,c={}),I(a,"get",c||{},o)}function l(a,c,o,u){return typeof o=="function"&&(u=o,o={}),o=o||{},c!=null&&o.body==null&&o.form==null&&(o.body=c),I(a,"post",o,u)}C.LxRequest={httpFetch:v,httpGet:f,httpPost:l,fetchData:I}})(window),(function(C){"use strict";function U(f){return f<10?"0"+f:String(f)}function B(f){var l=Math.trunc(f/60),a=Math.trunc(f%60);return l===0&&a===0?"--/--":U(l)+":"+U(a)}function G(f){if(!f)return"0 B";var l=["B","KiB","MiB","GiB","TiB"],a=Math.floor(Math.log(f)/Math.log(1024));return(f/Math.pow(1024,Math.floor(a))).toFixed(2)+" "+l[a]}function D(f){return f?new window.DOMParser().parseFromString(String(f),"text/html").body.textContent:""}function p(f,l,a){if(l=l||"name",a=a||"、",Array.isArray(f)){var c=[];return f.forEach(function(o){var u=o&&o[l];u&&c.push(u)}),D(c.join(a))}return D(String(f??""))}var Q=[7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21],J=null;function I(){if(J)return J;J=[];for(var f=0;f<64;f++)J[f]=Math.floor(Math.abs(Math.sin(f+1))*4294967296)|0;return J}function v(f){var l=new TextEncoder().encode(f),a=Q,c=I(),o=l.length*8,u=new Uint8Array((l.length+8>>6)+1<<6);u.set(l),u[l.length]=128;var g=new DataView(u.buffer);g.setUint32(u.length-8,o>>>0,!0),g.setUint32(u.length-4,Math.floor(o/4294967296),!0);for(var m=1732584193,L=4023233417,d=2562383102,h=271733878,E=new Array(16),w=0;w<u.length;w+=64){for(var i=0;i<16;i++)E[i]=g.getUint32(w+i*4,!0);for(var b=m,y=L,A=d,q=h,T=0;T<64;T++){var R,K;T<16?(R=y&A|~y&q,K=T):T<32?(R=q&y|~q&A,K=(5*T+1)%16):T<48?(R=y^A^q,K=(3*T+5)%16):(R=A^(y|~q),K=7*T%16),R=R+b+c[T]+E[K]|0,b=q,q=A,A=y,y=y+(R<<a[T]|R>>>32-a[T])|0}m=m+b|0,L=L+y|0,d=d+A|0,h=h+q|0}var W=function(nn){for(var ln="",V=0;V<4;V++)ln+=(nn>>>V*8&255).toString(16).padStart(2,"0");return ln};return W(m)+W(L)+W(d)+W(h)}C.LxUtils={numFix:U,formatPlayTime:B,sizeFormate:G,decodeName:D,formatSingerName:p,toMD5:v}})(window),(function(C){"use strict";var U=new Uint8Array(256),B=new Uint8Array(256),G=[1,2,4,8,16,32,64,128,27,54];(function(){var a=1,c=1;do{a=(a^a<<1^(a&128?27:0))&255,c^=c<<1,c^=c<<2,c^=c<<4,c&=255,c&128&&(c^=9);var o=c^(c<<1|c>>7)^(c<<2|c>>6)^(c<<3|c>>5)^(c<<4|c>>4);U[a]=(o^99)&255}while(a!==1);U[0]=99;for(var u=0;u<256;u++)B[U[u]]=u})();function D(l){return(l<<1^(l&128?27:0))&255}function p(l,a){for(var c=0;a;)a&1&&(c^=l),l=D(l),a>>=1;return c&255}function Q(l){for(var a=l.length/4,c=a+6,o=[],u=0;u<a;u++)o[u]=[l[4*u],l[4*u+1],l[4*u+2],l[4*u+3]];for(var g=a;g<4*(c+1);g++){var m=o[g-1].slice();g%a===0?(m.push(m.shift()),m=m.map(function(L){return U[L]}),m[0]^=G[g/a-1]):a>6&&g%a===4&&(m=m.map(function(L){return U[L]})),o[g]=o[g-a].map(function(L,d){return L^m[d]})}return{w:o,Nr:c}}function J(l,a){for(var c=[[],[],[],[]],o=0;o<4;o++)for(var u=0;u<4;u++)c[u][o]=l[o*4+u];function g(b){for(var y=0;y<4;y++)for(var A=a.w[b*4+y],q=0;q<4;q++)c[q][y]^=A[q]}function m(){for(var b=0;b<4;b++)for(var y=0;y<4;y++)c[b][y]=U[c[b][y]]}function L(){for(var b=1;b<4;b++)c[b]=c[b].slice(b).concat(c[b].slice(0,b))}function d(){for(var b=0;b<4;b++){var y=c[0][b],A=c[1][b],q=c[2][b],T=c[3][b];c[0][b]=p(y,2)^p(A,3)^q^T,c[1][b]=y^p(A,2)^p(q,3)^T,c[2][b]=y^A^p(q,2)^p(T,3),c[3][b]=p(y,3)^A^q^p(T,2)}}g(0);for(var h=1;h<a.Nr;h++)m(),L(),d(),g(h);m(),L(),g(a.Nr);for(var E=new Uint8Array(16),w=0;w<4;w++)for(var i=0;i<4;i++)E[w*4+i]=c[i][w];return E}function I(l){return l instanceof Uint8Array?l:l instanceof ArrayBuffer?new Uint8Array(l):new TextEncoder().encode(String(l))}function v(l,a){var c=I(l),o=I(a),u=Q(o),g=16-c.length%16,m=new Uint8Array(c.length+g);m.set(c);for(var L=0;L<g;L++)m[c.length+L]=g;for(var d=new Uint8Array(m.length),h=0;h<m.length;h+=16)d.set(J(m.slice(h,h+16),u),h);return d}function f(l){for(var a="",c=0;c<l.length;c++)a+=l[c].toString(16).padStart(2,"0");return a.toUpperCase()}C.LxAes={encryptEcb:v,toHexUpper:f}})(window),(function(C){"use strict";var U=C.LxRequest,B=C.LxUtils,G=/level:(\w+),bitrate:(\d+),format:(\w+),size:([\w.]+)/;function D(J){return String(J||"").replace(/&/g,"、")}function p(J){var I=[];if(!J)return I;for(var v=0;v<J.length;v++){var f=J[v],l=String(f.MUSICRID||"").replace("MUSIC_","");if(f.N_MINFO){for(var a=[],c={},o=f.N_MINFO.split(";"),u=0;u<o.length;u++){var g=o[u].match(G);if(g){var m=g[4];switch(g[2]){case"4000":a.push({type:"flac24bit",size:m}),c.flac24bit={size:m.toLocaleUpperCase()};break;case"2000":a.push({type:"flac",size:m}),c.flac={size:m.toLocaleUpperCase()};break;case"320":a.push({type:"320k",size:m}),c["320k"]={size:m.toLocaleUpperCase()};break;case"128":a.push({type:"128k",size:m}),c["128k"]={size:m.toLocaleUpperCase()};break}}}a.reverse();var L=parseInt(f.DURATION,10);I.push({name:B.decodeName(f.SONGNAME),singer:D(B.decodeName(f.ARTIST)),source:"kw",songmid:l,albumId:B.decodeName(f.ALBUMID||""),interval:isNaN(L)?0:B.formatPlayTime(L),albumName:f.ALBUM?B.decodeName(f.ALBUM):"",lrc:null,img:null,types:a,_types:c})}}return I}function Q(J,I,v,f){if(I=I||1,v=v||30,f=f||0,f>0)return Promise.reject(new Error("酷我搜索失败"));var l="http://search.kuwo.cn/r.s?client=kt&all="+encodeURIComponent(J)+"&pn="+(I-1)+"&rn="+v+"&uid=794762570&ver=kwplayer_ar_9.2.2.1&vipver=1&show_copyright_off=1&newver=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1&issubtitle=1";return U.httpFetch(l).promise.then(function(a){var c=a.body;if(!c||c.TOTAL!=="0"&&c.SHOW==="0")return Q(J,I,v,f+1);var o=p(c.abslist);if(o==null)return Q(J,I,v,f+1);var u=parseInt(c.TOTAL,10)||0;return{list:o,allPage:Math.ceil(u/v),total:u,limit:v,source:"kw"}})}C.LxSourceKw={id:"kw",name:"酷我",search:Q}})(window),(function(C){"use strict";var U=C.LxRequest,B=C.LxUtils;function G(Q){var J=[],I={};function v(f,l,a){var c=Q[l],o=Q[a];if(!(!c||!o)){var u=B.sizeFormate(c);J.push({type:f,size:u,hash:o}),I[f]={size:u,hash:o}}}return v("128k","FileSize","FileHash"),v("320k","HQFileSize","HQFileHash"),v("flac","SQFileSize","SQFileHash"),v("flac24bit","ResFileSize","ResFileHash"),{singer:B.decodeName(B.formatSingerName(Q.Singers,"name")),name:B.decodeName(Q.OriSongName+(Q.Suffix?" "+Q.Suffix:"")),albumName:B.decodeName(Q.AlbumName),albumId:Q.AlbumID,songmid:Q.Audioid,albumAudioId:Q.MixSongID,source:"kg",interval:B.formatPlayTime(Q.Duration),_interval:Q.Duration,img:null,lrc:null,hash:Q.FileHash,types:J,_types:I}}function D(Q){var J={},I=[];return Q.forEach(function(v){var f=v.Audioid+v.FileHash;J[f]||(J[f]=!0,I.push(G(v)),(v.Grp||[]).forEach(function(l){var a=l.Audioid+l.FileHash;J[a]||(J[a]=!0,I.push(G(l)))}))}),I}function p(Q,J,I,v){if(v=v||0,J=J||1,I=I||30,++v>1)return Promise.reject(new Error("酷狗搜索失败"));var f="http://songsearch.kugou.com/song_search_v2?platform=AndroidFilter&iscorrection=1&keyword="+encodeURIComponent(Q)+"&hifiquality=0&pagesize="+I+"&PrivilegeFilter=0&page="+J;return U.httpFetch(f).promise.then(function(l){var a=l.body;if(!a||a.error_code!==0)return p(Q,J,I,v);var c=D(a.data.lists||[]);if(!c)return p(Q,J,I,v);var o=a.data.total;return{list:c,allPage:Math.ceil(o/I),limit:I,total:o,source:"kg"}})}C.LxSourceKg={id:"kg",name:"酷狗",search:p}})(window),(function(C){"use strict";var U=C.LxRequest,B=C.LxUtils,G=[23,14,6,36,16,40,7,19],D=[16,1,32,12,19,27,8,5],p=[89,39,179,150,218,82,58,252,177,52,186,123,120,64,242,133,143,161,121,179];function Q(o){var u=new TextEncoder().encode(o),g=u.length*8,m=new Uint8Array((u.length+8>>6)+1<<6);m.set(u),m[u.length]=128;var L=new DataView(m.buffer);L.setUint32(m.length-8,Math.floor(g/4294967296),!1),L.setUint32(m.length-4,g>>>0,!1);var d=1732584193,h=4023233417,E=2562383102,w=271733878,i=3285377520;function b(on,qn){return(on<<qn|on>>>32-qn)>>>0}for(var y=new Uint32Array(80),A=0;A<m.length;A+=64){for(var q=0;q<16;q++)y[q]=L.getUint32(A+q*4,!1);for(var T=16;T<80;T++)y[T]=b(y[T-3]^y[T-8]^y[T-14]^y[T-16],1);for(var R=d,K=h,W=E,nn=w,ln=i,V=0;V<80;V++){var an,dn;V<20?(an=K&W|~K&nn,dn=1518500249):V<40?(an=K^W^nn,dn=1859775393):V<60?(an=K&W|K&nn|W&nn,dn=2400959708):(an=K^W^nn,dn=3395469782);var hn=b(R,5)+an+ln+dn+y[V]>>>0;ln=nn,nn=W,W=b(K,30),K=R,R=hn}d=d+R>>>0,h=h+K>>>0,E=E+W>>>0,w=w+nn>>>0,i=i+ln>>>0}return[d,h,E,w,i].map(function(on){return on.toString(16).padStart(8,"0")}).join("")}function J(o,u){return u.map(function(g){return o[g]}).join("")}function I(o){for(var u="",g=0;g<o.length;g++)u+=String.fromCharCode(o[g]);return btoa(u).replace(/[\\/+=]/g,"")}function v(o){var u=Q(o);return(function(){var g=J(u,G),m=J(u,D),L=p.map(function(h,E){return h^parseInt(u.slice(E*2,E*2+2),16)}),d=I(L).replace(/[\\/+=]/g,"");return("zzc"+g+d+m).toLowerCase()})()}function f(){for(var o="",u=0;u<32;u++)o+=Math.floor(Math.random()*16).toString(16);return o.toUpperCase()+String(Math.floor(Math.random()*1e5)).padStart(5,"0")}function l(o){var u=v(JSON.stringify(o));return U.httpFetch("https://u.y.qq.com/cgi-bin/musics.fcg?sign="+u,{method:"post",headers:{"User-Agent":"QQMusic 14090508(android 12)"},body:o}).promise}function a(o){var u=[],g={};if((o.file?.media_mid?[{type:"128k",size:o.file.size_128mp3,mid:o.file.media_mid}]:[]).forEach(function(E){var w=B.sizeFormate(E.size);u.push({type:E.type,size:w}),g[E.type]={size:w}}),o.file?.size_320mp3){var m=B.sizeFormate(o.file.size_320mp3);u.push({type:"320k",size:m}),g["320k"]={size:m}}if(o.file?.size_flac){var L=B.sizeFormate(o.file.size_flac);u.push({type:"flac",size:L}),g.flac={size:L}}if(o.file?.size_hires){var d=B.sizeFormate(o.file.size_hires);u.push({type:"flac24bit",size:d}),g.flac24bit={size:d}}var h=(o.singer||[]).map(function(E){return{name:E.name}});return{singer:B.decodeName(B.formatSingerName(h)),name:B.decodeName(o.title),albumName:B.decodeName(o.album?.name||""),albumId:o.album?.id,songmid:o.mid,strMediaMid:o.file?.media_mid,source:"tx",interval:B.formatPlayTime(o.interval),img:null,lrc:null,types:u,_types:g}}function c(o,u,g,m){if(u=u||1,g=g||50,m=m||0,m>1)return Promise.reject(new Error("企鹅搜索失败"));var L={comm:{_channelid:"0",_os_version:"6.2.9200-2",ct:"19",cv:"2151",guid:"1F70E520B2EAA7D25E11760783C53CA9",patch:"118",psrf_access_token_expiresAt:0,psrf_qqaccess_token:"",psrf_qqopenid:"",psrf_qqunionid:"",tmeAppID:"qqmusic",tmeLoginType:0,uin:"0",wid:"7223299733393904640"},"music.search.SearchCgiService":{module:"music.search.SearchCgiService",method:"DoSearchForQQMusicDesktop",param:{grp:1,num_per_page:g,page_num:u,query:o,remoteplace:"txt.newclient.top",search_type:0,searchid:f()}}};return l(L).then(function(d){var h=d.body,E=h&&h["music.search.SearchCgiService"]||h&&h.req;if(!E||h.code!==0||E.code!==0)return c(o,u,g,m+1);var w=E.data,i=(w.body?.song?.list||[]).map(a),b=w.meta?.sum||i.length;return{list:i,allPage:Math.ceil(b/g),limit:g,total:b,source:"tx"}})}C.LxSourceTx={id:"tx",name:"企鹅",search:c}})(window),(function(C){"use strict";var U=C.LxRequest,B=C.LxUtils;function G(Q,J){var I="963B7AA0D21511ED807EE5846EC87D20",v="6cdc72a439cef99a3418d2a78aa28c73",f=B.toMD5(J+v+"yyapp2d16148780a1dcc7408e06336b98cfd50"+I+Q);return{sign:f,deviceId:I}}function D(Q){var J=[],I={};return(Q||[]).forEach(function(v){(v||[]).forEach(function(f){if(!(!f.songId||!f.copyrightId||I[f.copyrightId])){I[f.copyrightId]=!0;var l=[],a={};(f.audioFormats||[]).forEach(function(o){var u=B.sizeFormate(o.asize!=null?o.asize:o.isize);switch(o.formatType){case"PQ":l.push({type:"128k",size:u}),a["128k"]={size:u};break;case"HQ":l.push({type:"320k",size:u}),a["320k"]={size:u};break;case"SQ":l.push({type:"flac",size:u}),a.flac={size:u};break;case"ZQ24":l.push({type:"flac24bit",size:u}),a.flac24bit={size:u};break}});var c=f.img3||f.img2||f.img1||null;c&&!/https?:/.test(c)&&(c="http://d.musicapp.migu.cn"+c),J.push({singer:B.formatSingerName(f.singerList),name:f.name,albumName:f.album,albumId:f.albumId,songmid:f.songId,copyrightId:f.copyrightId,source:"mg",interval:B.formatPlayTime(f.duration),img:c,lrc:null,lrcUrl:f.lrcUrl,types:l,_types:a})}})}),J}function p(Q,J,I,v){if(J=J||1,I=I||20,v=v||0,++v>1)return Promise.reject(new Error("咪咕搜索失败"));var f=Date.now().toString(),l=G(f,Q),a=encodeURIComponent('{"song":1,"album":0,"singer":0,"tagSong":1,"mvSong":0,"bestShow":1,"songlist":0,"lyricSong":0}'),c="https://jadeite.migu.cn/music_search/v3/search/searchAll?isCorrect=0&isCopyright=1&searchSwitch="+a+"&pageSize="+I+"&text="+encodeURIComponent(Q)+"&pageNo="+J+"&sort=0&sid=USS";return U.httpFetch(c,{headers:{uiVersion:"A_music_3.6.1",deviceId:l.deviceId,timestamp:f,sign:l.sign,channel:"0146921","User-Agent":"Mozilla/5.0 (Linux; U; Android 11.0.0; zh-cn; MI 11 Build/OPR1.170623.032) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30"}}).promise.then(function(o){var u=o.body;if(!u||u.code!=="000000")return Promise.reject(new Error(u&&u.info||"咪咕搜索失败"));var g=u.songResultData||{resultList:[],totalCount:0},m=D(g.resultList),L=parseInt(g.totalCount,10)||0;return{list:m,allPage:Math.ceil(L/I),limit:I,total:L,source:"mg"}})}C.LxSourceMg={id:"mg",name:"咪咕",search:p}})(window),(function(C){"use strict";var U=C.LxRequest,B=C.LxUtils,G="e82ckenh8dichen8";function D(f){var l=C.LxAes.encryptEcb(f,new TextEncoder().encode(G));return Promise.resolve(C.LxAes.toHexUpper(l))}function p(f,l){var a=typeof l=="object"?JSON.stringify(l):l,c="nobody"+f+"use"+a+"md5forencrypt",o=B.toMD5(c),u=f+"-36cd479b6b5-"+a+"-36cd479b6b5-"+o;return D(u).then(function(g){return{params:g}})}function Q(f,l){return p(f,l).then(function(a){return U.httpFetch("http://interface.music.163.com/eapi/batch",{method:"post",headers:{"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36",origin:"https://music.163.com"},form:a}).promise})}function J(f){return(f||[]).map(function(l){return l.name}).join("、")}function I(f){if(!Array.isArray(f))return[];var l=[];return f.forEach(function(a){if(!(!a||a.resourceType!=="song")){var c=(a.baseInfo||{}).simpleSongData;if(!(!c||c.id==null)){var o=[],u={},g=function(m){o.push({type:m,size:null}),u[m]={size:null}};c.hr&&g("flac24bit"),c.sq&&g("flac"),c.h&&g("320k"),(c.m||c.l||!c.hr&&!c.sq&&!c.h)&&g("128k"),l.push({singer:B.decodeName(J(c.ar)),name:B.decodeName(c.name),albumName:B.decodeName((c.al||{}).name||""),albumId:(c.al||{}).id,songmid:c.id,source:"wy",interval:B.formatPlayTime(Math.floor((c.dt||0)/1e3)),img:(c.al||{}).picUrl||null,lrc:null,types:o,_types:u})}}}),l}function v(f,l,a,c){return l=l||1,a=a||30,c=c||0,c>3?Promise.reject(new Error("网易搜索重试次数用尽")):Q("/api/search/song/list/page",{keyword:f,needCorrect:"1",channel:"typing",offset:a*(l-1),scene:"normal",total:l===1,limit:a}).then(function(o){var u=o.body;if(!u||u.code!==200)return u&&(u.code===460||u.code===405)?Promise.reject(new Error("网易接口限流（code "+u.code+"）")):v(f,l,a,c+1);var g=u.data||{},m=I(g.resources);!m.length&&u.result&&u.result.songs&&(m=I(u.result.songs.map(function(d){return{resourceType:"song",baseInfo:{simpleSongData:d}}})));var L=g.totalCount||u.result&&u.result.songCount||m.length;return{list:m,allPage:Math.ceil(L/a),limit:a,total:L,source:"wy"}})}C.LxSourceWy={id:"wy",name:"网易云",search:v}})(window),(function(C){"use strict";var U={},B=["kw","kg","tx","wy","mg"];function G(l){!l||!l.id||(U[l.id]=l)}function D(){return B.filter(function(l){return U[l]}).map(function(l){return{id:l,name:U[l].name}})}function p(l){var a={};return l.filter(function(c){var o=c.songmid||c.hash||c.albumAudioId||c.name+"|"+c.singer,u=c.source+"|"+o;return a[u]?!1:(a[u]=!0,!0)})}function Q(l,a){var c=l.map(function(u,g){return{it:u,i:g,s:J(u,a)}}),o={};return c.forEach(function(u){var g=u.it.source||"";u.n=o[g]||0,o[g]=u.n+1}),c.sort(function(u,g){return g.s-u.s||u.n-g.n||u.i-g.i}),c.map(function(u){return u.it})}function J(l,a){var c=String(l.name||"").toLowerCase(),o=String(a||"").toLowerCase();if(!o)return 0;if(c===o)return 100;if(c.indexOf(o)===0)return 80;if(c.indexOf(o)>-1)return 60;var u=String(l.singer||"").toLowerCase();return u.indexOf(o)>-1?40:10}function I(l,a,c,o){var u=U[l];return u?u.search(a,c,o):Promise.reject(new Error("未知音源: "+l))}function v(l,a,c,o){a=a||1,c=c||30,!Object.keys(U).length&&C.LxSourceKw&&(G(C.LxSourceKw),G(C.LxSourceKg),G(C.LxSourceTx),G(C.LxSourceWy),G(C.LxSourceMg));var u=B.filter(function(y){return U[y]}),g={};typeof o=="function"&&o({phase:"start",sources:u.slice(),done:0,total:u.length});var m=u.map(function(y){var A=Date.now();return I(y,l,a,c).then(function(q){return g[y]=Date.now()-A,{id:y,res:q}}).catch(function(q){return g[y]=Date.now()-A,{id:y,error:q}})}),L=12e3,d=[],h=u.length,E=!1,w=Promise.all(m.map(function(y,A){return y.then(function(q){return E||(d.push(q),h--,typeof o=="function"&&o({done:d.length,total:u.length,last:q,ms:g[q.id]})),q})})).then(function(y){var A=[],q={},T=[];return y.forEach(function(R){if(R.error){var K=R.error&&R.error.message||String(R.error);(/cancel request|ECANCELED/i.test(K)||/ETIMEDOUT|请求超时/.test(K))&&(K="请求超时"),T.push({source:R.id,message:K}),q[R.id]={list:[],total:0};return}var W=R.res&&R.res.list||[];q[R.id]={list:W,total:R.res&&R.res.total||W.length},A=A.concat(W)}),A=p(A),A=Q(A,l),{list:A,bySource:q,errors:T,timings:g}}),i=null,b=new Promise(function(y){i=setTimeout(function(){y("__TIMEOUT__")},L)});return Promise.race([w,b]).then(function(y){if(clearTimeout(i),y!=="__TIMEOUT__")return y;E=!0;var A=[],q={},T=[];return d.forEach(function(R){if(R.error){T.push({source:R.id,message:R.error&&R.error.message||String(R.error)}),q[R.id]={list:[],total:0};return}var K=R.res&&R.res.list||[];q[R.id]={list:K,total:R.res&&R.res.total||K.length},A=A.concat(K)}),A=p(A),A=Q(A,l),h>0&&T.push({source:"slow",message:h+" 个平台响应慢，已跳过"}),{list:A,bySource:q,errors:T,timings:g}})}function f(l){var a={};return l.forEach(function(c){var o=String(c.name||"").toLowerCase().replace(/\s+/g,"")+"|"+String(c.singer||"").toLowerCase().replace(/\s+/g,"");a[o]||(a[o]={name:c.name,singer:c.singer,items:[]}),a[o].items.push(c)}),Object.keys(a).map(function(c){return a[c]})}C.LxSources={register:G,list:D,searchOne:I,searchAll:v,groupBySong:f}})(window),(function(C){"use strict";var U=C.LxRequest,B=null,G=null;function D(J){B&&(B.cancelHttp(),B=null);var I="https://searchtip.kugou.com/getSearchTip?MusicTipCount=10&keyword="+encodeURIComponent(J);return B=U.httpFetch(I,{headers:{referer:"https://www.kugou.com/"},timeout:4e3}),B.promise.then(function(v){var f=v.body,l=f&&f.data&&f.data[0]&&f.data[0].RecordDatas;return Array.isArray(l)?l.map(function(a){return a.HintInfo}).filter(Boolean):[]}).catch(function(){return[]})}function p(J){G&&(G.cancelHttp(),G=null);var I="https://tips.kuwo.cn/t.s?corp=kuwo&newver=3&p2p=1&notrace=0&c=mbox&w="+encodeURIComponent(J)+"&encoding=utf8&rformat=json";return G=U.httpFetch(I,{headers:{Referer:"http://www.kuwo.cn/"},timeout:4e3}),G.promise.then(function(v){var f=v.body,l=f&&f.WORDITEMS;return Array.isArray(l)?l.map(function(a){return a.RELWORD}).filter(Boolean):[]}).catch(function(){return[]})}function Q(J){return J=String(J||"").trim(),J?Promise.all([D(J),p(J)]).then(function(I){var v={},f=[];return I.forEach(function(l){l.forEach(function(a){var c=String(a).trim();!c||v[c]||(v[c]=!0,f.push(c))})}),f.slice(0,10)}):Promise.resolve([])}C.LxTipSearch={tipSearch:Q}})(window),(function(C){"use strict";var U=C.LxRequest;function B(I){if(!I)return[];for(var v=String(I).split(/\r?\n/),f=[],l=/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g,a=0;a<v.length;a++){var c=v[a],o=[],u;for(l.lastIndex=0;(u=l.exec(c))!==null;){var g=parseInt(u[1],10),m=parseInt(u[2],10),L=u[3]?parseInt((u[3]+"00").slice(0,3),10)/1e3:0;o.push(g*60+m+L)}if(o.length){var d=c.replace(/<[^>]*>/g,"").replace(/\[[^\]]*\]/g,"").trim();if(d)for(var h=0;h<o.length;h++)f.push({time:o[h],text:d})}}return f.sort(function(E,w){return E.time-w.time}),f}function G(I){var v=function(f){try{var l=new DecompressionStream(f);return new Response(new Blob([I]).stream().pipeThrough(l)).arrayBuffer()}catch(a){return Promise.reject(a)}};return v("deflate").catch(function(){return v("deflate-raw")})}function D(I){var v=new TextDecoder("latin1").decode(I);if(v.slice(0,10).toLowerCase()!=="tp=content")return Promise.resolve("");var f=v.indexOf(`\r
\r
`);if(f<0)return Promise.resolve("");var l=I.slice(f+4);return G(l).then(function(a){var c=new TextDecoder().decode(new Uint8Array(a)).trim(),o;try{o=atob(c)}catch{return""}for(var u="yeelion",g=new Uint8Array(o.length),m=0;m<o.length;m++)g[m]=o.charCodeAt(m)^u.charCodeAt(m%u.length);return new TextDecoder("utf-8").decode(g)}).catch(function(){return""})}function p(I){if(!I)return Promise.resolve(null);var v="http://mlyric.kuwo.cn/mobi.s?f=web&type=lyric&lrcx=1&rid="+encodeURIComponent(I)+"&encode=utf8";return U.httpFetch(v,{timeout:8e3,responseType:"arraybuffer"}).promise.then(function(f){var l=f.raw;if(!l)return null;var a=l instanceof Uint8Array?l:new Uint8Array(l);return D(a).then(function(c){if(!c||!/\[\d{1,3}:\d{1,2}/.test(c))return null;var o=B(c);return o.length?{lyric:c,parsed:o,source:"kw"}:null})}).catch(function(){return null})}function Q(I){var v=String(I.title||I.name||"").trim(),f=String(I.artist||I.singer||"").trim();if(!v)return Promise.resolve([]);/群星|various\s*artists?|va$/i.test(f)&&(f="");var l=function(a,c){var o="http://search.kuwo.cn/r.s?client=kt&all="+encodeURIComponent(a)+"&pn=0&rn=8&uid=794762570&ver=kwplayer_ar_9.2.2.1&vipver=1&show_copyright_off=1&newver=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1";return U.httpFetch(o,{timeout:8e3}).promise.then(function(u){var g=u&&u.body;if(!g)return[];var m=g.abslist||g.absList||[];if(!m.length)return[];for(var L=v.toLowerCase(),d=f.toLowerCase(),h=[],E=[],w=[],i=0;i<m.length;i++){var b=m[i],y=String(b.SONGNAME||"").toLowerCase().trim(),A=String(b.ARTIST||"").toLowerCase(),q=String(b.MUSICRID||"").replace("MUSIC_","");if(q){var T=y===L||y.indexOf(L)===0,R=!d||A.indexOf(d)>-1;T&&R?h.push(q):T?E.push(q):c&&w.push(q)}}return c?h:h.concat(E)}).catch(function(){return[]})};return l((v+" "+f).trim(),!0).then(function(a){return a.length?a:l(v,!1)})}function J(I){var v={lyric:"",parsed:[],source:""};if(!I)return Promise.resolve(v);var f=I.track||I,l=I.source||f.source,a=(function(){return!C.LxSandbox||!C.LxSandbox.hasAny()||!C.LxSandbox.getLyric?Promise.resolve(null):C.LxSandbox.getLyric(l,{songmid:f.songmid,songId:f.songmid,hash:f.hash,albumId:f.albumId,copyrightId:f.copyrightId,name:f.name,singer:f.singer}).catch(function(){return null})})();return a.then(function(c){var o=c&&(c.lyric||c.lxlyric||"");if(o&&/\[\d+:\d+/.test(o)){var u=B(o);if(u.length)return{lyric:o,tlyric:c.tlyric||"",parsed:u,source:"script"}}var g=l==="kw"?p(f.songmid):Promise.resolve(null);return g.then(function(m){return m||Q(I).then(function(L){if(!L.length)return v;var d=Date.now()+6e3,h=function(E){return E>=L.length||E>=3||Date.now()>d?Promise.resolve(v):p(L[E]).then(function(w){return w||h(E+1)})};return h(0)})})})}C.LxLyric={parseLrc:B,getLyric:J,decodeKwLyric:D}})(window),(function(C){"use strict";var U=C.LxRequest,B="juice_cover_cache_v1",G=["https://img1.kuwo.cn/star/albumcover/","https://img2.kuwo.cn/star/albumcover/","https://img3.kuwo.cn/star/albumcover/"],D=null;function p(){if(D)return D;try{D=JSON.parse(localStorage.getItem(B)||"{}")||{}}catch{D={}}return D}function Q(){if(D)try{var l=Object.keys(D);l.length>300&&l.slice(0,l.length-300).forEach(function(a){delete D[a]}),localStorage.setItem(B,JSON.stringify(D))}catch{}}function J(l){var a=l.songmid||l.hash||l.albumAudioId||l.id||"",c=String(l.title||l.name||"")+"|"+String(l.artist||l.singer||"");return(l.source?l.source+"|":"")+(a||c)}function I(l){if(!l)return"";var a=String(l).trim();return a=a.replace(/^\d+\//,"500/"),/^https?:/.test(a)?a:G[0]+a}function v(l){var a=String(l.title||l.name||"").trim(),c=String(l.artist||l.singer||"").trim();if(!a)return Promise.resolve(null);/群星|various\s*artists?/i.test(c)&&(c="");var o=(a+" "+c).trim(),u="http://search.kuwo.cn/r.s?client=kt&all="+encodeURIComponent(o)+"&pn=0&rn=5&uid=794762570&ver=kwplayer_ar_9.2.2.1&vipver=1&show_copyright_off=1&newver=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1";return U.httpFetch(u,{timeout:7e3}).promise.then(function(g){var m=g&&g.body&&(g.body.abslist||g.body.absList)||[];if(!m.length)return null;for(var L=a.toLowerCase(),d=c.toLowerCase(),h=null,E=0;E<m.length;E++){var w=m[E],i=String(w.SONGNAME||"").toLowerCase().trim(),b=String(w.ARTIST||"").toLowerCase(),y=i===L||i.indexOf(L)===0,A=!d||b.indexOf(d)>-1;if(y&&A&&w.web_albumpic_short){h=w;break}!h&&y&&w.web_albumpic_short&&(h=w)}return h?I(h.web_albumpic_short):null}).catch(function(){return null})}function f(l){if(!l)return Promise.resolve("");var a=l.track||l;if(l.cover)return Promise.resolve(l.cover);if(a.img)return Promise.resolve(a.img);var c=J(l),o=p();return o[c]?Promise.resolve(o[c]):v(l).then(function(u){return u&&(o[c]=u,Q()),u||""})}C.LxCover={getCover:f,picUrl:I}})(window),(function(C){"use strict";var U=C.LxRequest,B="http://mobilecdn.kugou.com/api/v3",G={};function D(v){return v?String(v).replace("{size}","480").replace(/^http:/,"https:"):""}function p(v){var f=Math.round((Number(v)||0)/1e3);if(!f)return"";var l=Math.floor(f/60),a=f%60;return l+":"+(a<10?"0":"")+a}function Q(v){var f=Number(v)||0;if(!f)return"";for(var l=["B","KB","MB","GB"],a=0;f>=1024&&a<l.length-1;)f/=1024,a++;return f.toFixed(a===0?0:2)+" "+l[a]}function J(){var v=B+"/rank/list?parentid=0&apiver=2&plat=0&withsong=0";return U.httpFetch(v,{timeout:8e3}).promise.then(function(f){var l=f&&f.body&&f.body.data&&f.body.data.info;return Array.isArray(l)?l.map(function(a){return{id:a.rankid,name:a.rankname,cover:D(a.imgurl||a.banner_9||a.banner_3||""),intro:String(a.intro||"").split(`
`)[0].slice(0,40)}}).filter(function(a){return a.id&&a.name}):[]}).catch(function(){return[]})}function I(v,f,l){f=f||1,l=l||30;var a=B+"/rank/song?rankid="+encodeURIComponent(v)+"&page="+f+"&pagesize="+l+"&version=8000&plat=0&apiver=2&with_res_tag=0";return U.httpFetch(a,{timeout:1e4}).promise.then(function(c){var o=c&&c.body&&c.body.data&&c.body.data.info;return Array.isArray(o)?o.map(function(u){var g=(u.authors||[]).map(function(E){return E.author_name}).filter(Boolean).join("、");if(!g&&u.filename){var m=String(u.filename).split(" - ");m.length>1&&(g=m[0])}var L=String(u.audio_id||u.album_audio_id||u.hash||""),d=[],h={};return u.hash&&u.filesize&&(d.push({type:"128k",size:Q(u.filesize),hash:u.hash}),h["128k"]={size:Q(u.filesize),hash:u.hash}),u.hash_high&&u.filesize_high&&(d.push({type:"320k",size:Q(u.filesize_high),hash:u.hash_high}),h["320k"]={size:Q(u.filesize_high),hash:u.hash_high}),u.sqhash&&u.sqfilesize&&(d.push({type:"flac",size:Q(u.sqfilesize),hash:u.sqhash}),h.flac={size:Q(u.sqfilesize),hash:u.sqhash}),{name:u.songname||u.remark||"",singer:g,source:"kg",songmid:L,albumAudioId:u.album_audio_id,hash:u.hash,albumId:u.album_id,interval:p((Number(u.duration)||0)*1e3),img:D(u.album_sizable_cover||u.cover||""),types:d,_types:h,typeUrl:{}}}).filter(function(u){return u.name}):[]}).catch(function(){return[]})}C.LxDiscover={listRanks:J,rankSongs:I}})(window),(function(C){"use strict";var U="/lx-user-api-sandbox.html",B=12e3,G=[];function D(m){var L=String(m||"").slice(0,4096),d=function(b){var y=new RegExp("^[ \\t]*(?:\\*|//|/\\*+!?)?[ \\t]*@"+b+"[ \\t\\u3000\\u00a0]+([^\\r\\n]+?)[ \\t]*(?:\\*/)?[ \\t]*$","m"),A=y.exec(L);return A?A[1].trim():""},h=d("name"),E="未命名音源";if(!h){for(var w=0,i=0;i<m.length;i++)w=w*31+m.charCodeAt(i)|0;E="未命名音源_"+(w>>>0).toString(36).slice(0,6)}return{name:h||E,description:d("description"),version:d("version"),author:d("author"),homepage:d("homepage")||d("repository"),rawScript:m}}function p(m){var L=C.LxRequest,d=m.headers||{},h={method:(m.method||"get").toLowerCase(),headers:d,timeout:m.timeout||2e4,kind:"api"};return m.form?h.form=m.form:m.body!=null&&(h.body=m.body),L.httpFetch(m.url,h).promise.then(function(E){return{statusCode:E.statusCode,statusMessage:E.statusMessage,headers:E.headers,bytes:E.raw?E.raw.length:0,raw:E.raw,body:E.body}})}function Q(m,L){return new Promise(function(d,h){var E=document.createElement("iframe");E.setAttribute("sandbox","allow-scripts"),E.style.display="none",E.src=U;var w={id:"sb_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,6),iframe:E,scriptInfo:L,sources:{},requestSeq:0,aborted:{}},i=!1,b=null,y=new Promise(function(R){b=R});function A(){clearTimeout(q);try{window.removeEventListener("message",T)}catch{}try{E.parentNode&&E.parentNode.removeChild(E)}catch{}w.sources={},w.dead=!0}w.teardown=A;var q=setTimeout(function(){i||(i=!0,A(),h(new Error("音源「"+L.name+"」加载超时")))},B);function T(R){if(R.source===E.contentWindow){var K=R.data;if(!(!K||typeof K!="object"))switch(K.type){case"ready":b&&b();break;case"inited":{var W=K.data&&K.data.sources,nn={};if(W&&typeof W=="object"&&Object.keys(W).forEach(function(V){W[V]&&W[V].type==="music"&&(nn[V]=W[V])}),!Object.keys(nn).length){var ln=K.data&&K.data.message||"音源「"+L.name+"」未声明任何可用平台";i||(i=!0,A(),h(new Error(ln)));break}w.sources=nn,i||(i=!0,clearTimeout(q),d(w));break}case"request":{(function(V){var an=V.id;if(w.aborted[an]){delete w.aborted[an];return}var dn=function(hn){var on=E.contentWindow;if(on)try{on.postMessage(hn,"*")}catch{}};p(V.payload).then(function(hn){dn({type:"request-result",id:an,resp:hn})}).catch(function(hn){dn({type:"request-result",id:an,error:hn&&hn.message||String(hn)})})})(K);break}case"abort":w.aborted[K.id]=!0;break;case"error":console.error("[音源:"+L.name+"]",K.message);break}}}window.addEventListener("message",T),document.body.appendChild(E),y.then(function(){E.contentWindow.postMessage({type:"init",script:m,scriptInfo:L},"*")})})}function J(m,L){var d=++m.requestSeq;return new Promise(function(h,E){var w=setTimeout(function(){window.removeEventListener("message",i),E(new Error("音源「"+m.scriptInfo.name+"」请求超时"))},8e3);function i(b){if(b.source===m.iframe.contentWindow){var y=b.data;!y||y.type!=="invoke-result"||y.reqId!==d||(clearTimeout(w),window.removeEventListener("message",i),y.error?E(new Error(y.error)):h(y.result))}}window.addEventListener("message",i),m.iframe.contentWindow.postMessage({type:"invoke-request",reqId:d,payload:L},"*")})}function I(m){var L=D(m);return Q(m,L).then(function(d){return G.push(d),{id:d.id,name:d.scriptInfo.name,version:d.scriptInfo.version,sources:Object.keys(d.sources)}})}function v(m){return G.filter(function(L){var d=L.sources[m];return d&&d.actions&&d.actions.indexOf("musicUrl")>-1})}function f(m,L,d,h){return J(m,{source:L,action:"musicUrl",info:{type:h||"128k",musicInfo:d}})}function l(m,L,d){var h=v(m);if(!h.length)return Promise.reject(new Error("没有音源支持 "+m+" 的播放地址获取"));var E=[];function w(i){if(i>=h.length)return Promise.reject(new Error(E.join(`
`)));var b=h[i];return f(b,m,L,d).catch(function(y){return E.push(b.scriptInfo.name+": "+(y&&y.message||y)),w(i+1)})}return w(0)}function a(m,L){var d=G.find(function(h){var E=h.sources[m];return E&&E.actions&&E.actions.indexOf("lyric")>-1});return d?J(d,{source:m,action:"lyric",info:{musicInfo:L}}):Promise.reject(new Error("没有音源支持歌词"))}function c(){G.forEach(function(m){m.teardown?m.teardown():m.iframe.remove()}),G=[]}function o(m,L){G=G.filter(function(d){return d.scriptInfo.name===m&&d.scriptInfo.version===L?(d.teardown?d.teardown():d.iframe.remove(),!1):!0})}function u(){return G.map(function(m){return{id:m.id,name:m.scriptInfo.name,version:m.scriptInfo.version,sources:Object.keys(m.sources)}})}function g(){return G.length>0}C.LxSandbox={parseScriptInfo:D,load:I,getMusicUrl:l,getMusicUrlFrom:f,candidatesFor:v,getLyric:a,destroy:c,removeByName:o,listLoaded:u,hasAny:g}})(window),(function(C){"use strict";var U="juice_lx_sources_v1",B=!1;function G(){B||(C.LxSources.register(C.LxSourceKw),C.LxSources.register(C.LxSourceKg),C.LxSources.register(C.LxSourceTx),C.LxSources.register(C.LxSourceWy),C.LxSources.register(C.LxSourceMg),B=!0)}function D(){try{var i=localStorage.getItem(U),b=i?JSON.parse(i):[];return Array.isArray(b)?b:[]}catch{return[]}}function p(i){try{localStorage.setItem(U,JSON.stringify(i))}catch{}}function Q(){return D().map(function(i){return{id:i.id,name:i.name,version:i.version,enabled:i.enabled!==!1}})}function J(i){if(!i||!String(i).trim())return Promise.reject(new Error("脚本内容为空"));if(!/^\s*\/\*[\s\S]+?\*\//.test(i))return Promise.reject(new Error("无效的音源文件：缺少 /*! ... */ 头部注释"));var b=C.LxSandbox.parseScriptInfo(i),y=D(),A=y.filter(function(T){return T.script===i})[0],q={id:A?A.id:"src_"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name:b.name,version:b.version,script:i,enabled:!0};return A?y=y.map(function(T){return T.id===A.id?q:T}):y.push(q),p(y),C.LxSandbox.load(i).then(function(T){return{id:q.id,name:T.name,version:T.version,sources:T.sources}})}function I(i){var b=D(),y=b.filter(function(A){return A.id===i})[0];y&&C.LxSandbox.removeByName(y.name,y.version),p(b.filter(function(A){return A.id!==i}))}function v(){var i=D().filter(function(A){return A.enabled!==!1});if(!i.length)return Promise.resolve([]);var b=[],y=Promise.resolve();return i.forEach(function(A){y=y.then(function(){return C.LxSandbox.load(A.script).then(function(q){b.push({ok:!0,name:q.name,sources:q.sources})}).catch(function(q){b.push({ok:!1,name:A.name,error:q&&q.message||String(q)})})})}),y.then(function(){return b})}function f(){var i=C.LX_BUILTIN_SOURCES;if(!Array.isArray(i)||!i.length)return Promise.resolve({ok:0,fail:0});var b=0,y=0,A=Promise.resolve();return i.forEach(function(q){A=A.then(function(){return C.LxSandbox.load(q.script).then(function(){b++}).catch(function(){y++})})}),A.then(function(){return console.log("[LxMusic] 内置音源: "+b+" 个加载成功，"+y+" 个失败"),{ok:b,fail:y}})}function l(i,b,y){return G(),C.LxSources.searchAll(i,b||1,30,y)}function a(i){var b=C.LxTipSearch?C.LxTipSearch.tipSearch(i):Promise.resolve([]);return b.catch(function(){return[]})}var c=Promise.resolve(),o=0,u={};function g(i){var b=String(i.interval||"").split(":").map(Number);return b.length<2||b.some(isNaN)?0:b.length===3?b[0]*3600+b[1]*60+b[2]:b[0]*60+b[1]}function m(i){return new Promise(function(b){var y=document.createElement("audio"),A=!1,q=setTimeout(function(){T(-2)},4e3);function T(R){if(!A){A=!0,clearTimeout(q),y.onloadedmetadata=null,y.onerror=null;try{y.removeAttribute("src"),y.load()}catch{}b(R)}}y.preload="metadata",y.onloadedmetadata=function(){T(isFinite(y.duration)?y.duration:-1)},y.onerror=function(){T(-1)},y.src=i})}function L(i,b){if(!C.LxSandbox.hasAny())return Promise.reject(new Error("尚未导入音源脚本，无法获取播放地址"));var y=++o,A={songmid:i.songmid,songId:i.songmid,hash:i.hash,albumId:i.albumId,albumAudioId:i.albumAudioId,copyrightId:i.copyrightId,strMediaMid:i.strMediaMid,name:i.name,singer:i.singer,types:i.types,_types:i._types},q=g(i),T=c.then(function(){if(y!==o)throw new Error("已被更新的取址请求取代");var W=C.LxSandbox.candidatesFor?C.LxSandbox.candidatesFor(i.source):[];if(!W.length)return C.LxSandbox.getMusicUrl(i.source,A,b||"128k");W=W.slice().sort(function(V,an){return(u[V.scriptInfo.name]||0)-(u[an.scriptInfo.name]||0)});var nn=[];function ln(V){if(V>=W.length)return Promise.reject(new Error(nn.join("；")||"没有音源返回可用地址"));if(y!==o){var an=new Error("已被更新的取址请求取代");return an.code="SUPERSEDED",Promise.reject(an)}var dn=W[V],hn=function(on){return nn.push(dn.scriptInfo.name+": "+on),ln(V+1)};return C.LxSandbox.getMusicUrlFrom(dn,i.source,A,b||"128k").then(function(on){return on?q?m(on).then(function(qn){return qn<=0||Math.abs(qn-q)<=5?on:(u[dn.scriptInfo.name]=(u[dn.scriptInfo.name]||0)+1,hn("时长不符（应为 "+q+"s，实际 "+Math.round(qn)+"s）"))}):on:hn("空地址")},function(on){return hn(on&&on.message||String(on))})}return ln(0)}),R=null,K=new Promise(function(W,nn){R=setTimeout(function(){c=Promise.resolve(),nn(new Error("音源全部无响应（超过 "+Math.round(d/1e3)+" 秒）"))},d),T.then(function(ln){clearTimeout(R),W(ln)},function(ln){clearTimeout(R),nn(ln)})});return c=T.catch(function(){}),K}var d=18e3;function h(){G();var i=C.LxSources.list().map(function(A){return A.id}),b=[],y=Promise.resolve();return i.forEach(function(A){y=y.then(function(){var q=Date.now();return C.LxSources.searchOne(A,"测试",1,5).then(function(T){b.push({source:A,ms:Date.now()-q,ok:!0,count:T.list.length})}).catch(function(T){b.push({source:A,ms:Date.now()-q,ok:!1,err:T&&T.message||String(T)})})})}),y.then(function(){return b})}function E(){return C.LxSandbox.hasAny()}function w(){return C.LxSandbox.listLoaded()}C.LxMusic={ready:G,search:l,tipSearch:a,resolveUrl:L,importScript:J,listScripts:Q,removeScript:I,loadSavedScripts:v,loadBuiltinScripts:f,hasSource:E,diagnose:h,listLoaded:w,sources:function(){return G(),C.LxSources.list()}}})(window),(function(){"use strict";var C="juice_music_v1",U=null,B="search",G=!1;function D(){return{volume:.8,repeat:"all",shuffle:!1,src:{builtin:"lx"},lists:[],history:[]}}var p=D();function Q(){try{var n=localStorage.getItem("juice_music_show_lyric");n!==null&&(Z=n==="1")}catch{}try{var e=localStorage.getItem(C);if(!e)return;var t=JSON.parse(e);if(t&&typeof t=="object"){p=Object.assign(D(),t),p.src=p.src&&typeof p.src=="object"?p.src:{};var r=p.src.builtin!=="lx";p.src.builtin="lx",r&&J()}}catch{p=D()}}function J(){try{localStorage.setItem(C,JSON.stringify(p))}catch{}}var I="juice_music_live_v1",v=0;function f(){if(!le){if(!h.length||w<0){try{localStorage.removeItem(I)}catch{}return}var n=un&&i&&un.id===i.id?un.pos:v;try{localStorage.setItem(I,JSON.stringify({v:1,qi:w,name:E,at:Date.now(),pos:n,queue:h.map(function(e){return{kind:e.kind,id:e.id,title:e.title,artist:e.artist,cover:e.cover||"",url:/^blob:/i.test(e.url||"")?"":e.url||"",source:e.source||"",interval:e.interval||"",track:e.track||null}})}))}catch{try{localStorage.setItem(I,JSON.stringify({v:1,qi:w,name:E,at:Date.now(),pos:v,queue:[]}))}catch{}}}}function l(){try{var n=localStorage.getItem(I);if(!n)return null;var e=JSON.parse(n);return!e||!Array.isArray(e.queue)||!e.queue.length?null:e}catch{return null}}function a(n){return window.escHtml(n)}function c(){return"m"+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}function o(n,e){return'<svg class="mu-ico'+(e?" "+e:"")+'" viewBox="0 0 24 24" aria-hidden="true" data-lucide="'+n+'"></svg>'}function u(n){window.paintLucideIcons&&window.paintLucideIcons(n||document)}function g(n){n=Math.max(0,Math.floor(n||0));var e=Math.floor(n/60);return e+":"+(n%60<10?"0":"")+n%60}function m(n){var e=String(n||"").split(":").map(Number);return e.length<2||e.some(isNaN)?0:e.length===3?e[0]*3600+e[1]*60+e[2]:e[0]*60+e[1]}function L(n){return String(n||"").replace(/\.[a-zA-Z0-9]{2,5}$/,"")}var d=null,h=[],E="",w=-1,i=null,b=0;function y(){return d||(d=document.createElement("audio"),d.preload="metadata",d.volume=p.volume,d.style.display="none",document.body.appendChild(d),d.addEventListener("timeupdate",V),d.addEventListener("loadedmetadata",V),d.addEventListener("durationchange",V),d.addEventListener("ended",ft),d.addEventListener("play",function(){Ln(!0)}),d.addEventListener("playing",function(){b=0,i&&(i.retried=!1,i.failed=!1)}),d.addEventListener("pause",function(){Ln(!1)}),d.addEventListener("seeked",function(){le=!1,dn=0,an=Math.floor(d.currentTime||0),v=an,f()}),d.addEventListener("error",function(){if(i&&i.track&&!i.retried){i.retried=!0,i.url="";try{d.removeAttribute("src"),d.load()}catch{}N("重新获取播放地址…"),T(!0);return}if(E==="搜索结果"&&h.length>1&&b<8){b++,N("「"+(i?i.title:"")+"」已下架，自动跳下一首"),nn(!0);return}i&&N("「"+i.title+"」播放失败（链接失效或格式不支持）"),Ln(!1)}),d)}function A(n,e,t){h=n.slice(),E=e||"",w=t==null||t<0||t>=h.length?0:t,T()}function q(n){if(!h.length||w<0){A([n],n.kind==="search"?"搜索结果":E,0);return}for(var e=-1,t=0;t<h.length;t++)if(h[t].id===n.id){e=t;break}if(e===w){N("正在播放这首");return}if(e>-1){w=e,T(),N("已跳到这首");return}h.splice(w+1,0,n),N("已插到下一首播放"),en&&On(),B==="lists"&&z(),f()}function T(n){if(h.length){var e=i;i=h[w];var t=!1;if(un&&un.id!==(i&&i.id)&&(un=null),i!==e&&(v=0,an=-1,dn=0),!i.url&&i.track){if(!window.LxMusic||!window.LxMusic.hasSource()){N("尚未导入音源脚本");return}if(i.loading){if(n){var r=y();if(r.paused&&r.getAttribute("src"))try{r.play().catch(function(){})}catch{}}return}var s=i,x=y();if(!x.paused)try{x.pause()}catch{}i.loading=!0,Ln(!1),ke(),Fn(),Un(),yn(),Nn(),en&&On(),Yn(!0),Rn=-1,Ae(i),K(i);var _=++on,S;try{S=window.LxMusic.resolveUrl(s.track,p.quality||"128k")}catch($){s.loading=!1,Yn(!1),R(s,$&&$.message?String($.message).slice(0,60):"unknown");return}Promise.resolve(S).then(function($){if(!(_!==on||i!==s)){if(!$){s.loading=!1,Yn(!1),R(s,"音源未返回地址");return}s.url=$,s.loading=!1,Yn(!1),T(n)}}).catch(function($){_!==on||i!==s||(s.loading=!1,Yn(!1),R(s,$&&$.message?String($.message).slice(0,60):"unknown",$&&$.code))});return}var M=y();try{M.pause()}catch{}if(M.src=i.url,un&&un.id===i.id){var P=un.pos;un=null;var H=++hn;t=!!n;var mn=!1,Cn=function(){M.removeEventListener("loadedmetadata",xn),M.removeEventListener("durationchange",xn),M.removeEventListener("canplay",xn),M.removeEventListener("canplaythrough",xn)},xn=function(){if(!mn){if(H!==hn){Cn();return}if(!(M.readyState<3)&&!(!isFinite(M.duration)||M.duration<=0)){if(mn=!0,Cn(),P>0&&P<M.duration-2)try{M.currentTime=P}catch{}V(),t&&(t=!1,M.play().catch(function(){}))}}};M.readyState>=3&&isFinite(M.duration)&&M.duration>0?xn():(M.addEventListener("loadedmetadata",xn),M.addEventListener("durationchange",xn),M.addEventListener("canplay",xn),M.addEventListener("canplaythrough",xn))}t||M.play().catch(function(){}),ke(),Ln(!M.paused),Fn(),Un(),yn(),Nn(),en&&On(),Rn=-1,Ae(i),K(i),O&&be(),f()}}function R(n,e,t){if(t!=="SUPERSEDED"){var r=y();try{r.pause()}catch{}try{r.removeAttribute("src"),r.load()}catch{}n.failed=!0,Ln(!1),Fn(),Un(),yn(),Nn(),en&&On(),N("「"+(n.title||"这首")+"」取不到播放地址："+e)}}function K(n){if(!(!n||n.cover)&&window.LxCover){var e=n.id||n.title+"|"+n.artist;window.LxCover.getCover(n).then(function(t){if(!(!t||!i||(i.id||i.title+"|"+i.artist)!==e)){i.cover=t,h[w]&&(h[w].cover=t),Fn();var r=document.getElementById("muDisc");if(r&&r.classList.toggle("spin",!d.paused&&!!t),O){var s=O.querySelector(".mu-imm-disc");s&&(s.innerHTML='<img src="'+a(t)+'" alt="">');var x=O.querySelector(".mu-imm-vinyl");x&&x.classList.toggle("spin",!d.paused)}yn()}}).catch(function(){})}}function W(){if(!i){xe().length?A(xe(),"直链歌单",0):de().length?A(de(),"本机文件",0):N("先导入一些音乐吧");return}var n=y();if(!n.getAttribute("src")){T(!0);return}if(n.error){i.url="",T(!0);return}n.paused?n.play().catch(function(){}):n.pause()}function nn(n){if(h.length){if(p.repeat==="one"&&n){d.currentTime=0,d.play().catch(function(){});return}var e=0;if(p.shuffle&&h.length>1){var t;do if(t=Math.floor(Math.random()*h.length),++e>h.length*2)break;while((t===w||h[t].failed)&&e<=h.length*2);w=t}else do if(w++,w>=h.length&&(w=0),++e>h.length)break;while(h[w].failed&&e<=h.length);T()}}function ln(){if(h.length){if(d&&d.currentTime>3){d.currentTime=0;return}w=w>0?w-1:h.length-1,T()}}function V(){var n=0,e=0,t=0;if(d&&(e=d.currentTime||0,t=d.duration||0,n=t?e/t:0),!t&&un&&i&&un.id===i.id){var r=m(i.interval);r&&(n=Math.min(1,un.pos/r))}for(var s=document.querySelectorAll(".mu-bar-progress i"),x=0;x<s.length;x++)s[x].style.width=(n*100).toFixed(2)+"%";for(var _=document.querySelectorAll(".mu-time-cur"),S=0;S<_.length;S++)_[S].textContent=g(e);for(var M=document.querySelectorAll(".mu-time-dur"),P=0;P<M.length;P++)M[P].textContent=g(t);for(var H=document.querySelectorAll(".mu-seek"),mn=0;mn<H.length;mn++)t&&(H[mn].max=String(t)),document.activeElement!==H[mn]&&t&&(H[mn].value=String(e));if("mediaSession"in navigator&&d&&d.duration)try{navigator.mediaSession.setPositionState({duration:d.duration,playbackRate:1,position:e})}catch{}O&&ce(e),xt(e),dt(e,t),qn(e)}var an=-1,dn=0,hn=0,on=0;function qn(n){if(!le&&!un){var e=Math.floor(n||0);(e>0||d&&d.duration>0&&d.currentTime===0)&&(v=e);var t=Date.now();e===an&&t-dn<4e3||t-dn<2e3||(an=e,dn=t,f())}}function dt(n,e){var t=document.getElementById("muPtCur"),r=document.getElementById("muPtDur");if(!(!t||!r)){if(!e&&un&&i&&un.id===i.id){t.textContent=g(un.pos),r.textContent="0:00";return}t.textContent=g(n),r.textContent=e?g(e):"0:00"}}var ae="";function xt(n){var e=document.getElementById("muBarLyric");if(e){var t=bn&&bn.parsed;if(!t||!t.length){ae&&(e.textContent="",ae="");return}for(var r=0,s=t.length-1,x=-1;r<=s;){var _=r+s>>1;t[_].time<=n?(x=_,r=_+1):s=_-1}var S=x>=0?t[x].text:"";S!==ae&&(ae=S,e.textContent=S)}}function ft(){nn(!0)}function Tn(n){p.volume=Math.min(1,Math.max(0,n)),d&&(d.volume=p.volume),J();for(var e=document.querySelectorAll(".mu-vol"),t=0;t<e.length;t++)e[t].value=String(p.volume);for(var r=document.querySelectorAll("#muBarVolNum, #muImmVolNum"),s=0;s<r.length;s++)r[s].textContent=String(Math.round(p.volume*100));typeof Te=="function"&&Te(),typeof ye=="function"&&ye()}function ke(){if(!(!("mediaSession"in navigator)||!i))try{navigator.mediaSession.metadata=new MediaMetadata({title:i.title||"未知曲目",artist:i.artist||"",album:"我的音乐台",artwork:i.cover?[{src:i.cover,sizes:"512x512"}]:[]}),navigator.mediaSession.setActionHandler("play",function(){d.play()}),navigator.mediaSession.setActionHandler("pause",function(){d.pause()}),navigator.mediaSession.setActionHandler("previoustrack",ln),navigator.mediaSession.setActionHandler("nexttrack",function(){nn(!1)})}catch{}}var Mn=[],Kn=null;function de(){return Mn.map(function(n){return{kind:"local",id:n.title+":"+n.size,title:n.title,artist:"本机文件",cover:"",url:n.url}})}function Pe(){return new Promise(function(n){var e=indexedDB.open("juice_music",1);e.onupgradeneeded=function(){e.result.createObjectStore("kv")},e.onsuccess=function(){n(e.result)},e.onerror=function(){n(null)}})}function mt(n,e){return Pe().then(function(t){if(t)try{t.transaction("kv","readwrite").objectStore("kv").put(e,n)}catch{}})}function ht(n){return new Promise(function(e){Pe().then(function(t){if(!t){e(null);return}try{var r=t.transaction("kv").objectStore("kv").get(n);r.onsuccess=function(){e(r.result||null)},r.onerror=function(){e(null)}}catch{e(null)}})})}function Qe(n){for(var e=0,t=0;t<n.length;t++){var r=n[t];!/^audio\//.test(r.type)&&!/\.(mp3|flac|ogg|wav|m4a|aac|opus)$/i.test(r.name)||(Mn.push({title:L(r.name),size:r.size,url:URL.createObjectURL(r)}),e++)}e?(p.localMeta=Mn.map(function(s){return{title:s.title,size:s.size}}),p.folderName="",J(),N("已加入 "+e+" 首本机音乐"),yn()):N("没有识别到音频文件")}function pr(){ht("folder").then(function(n){Kn=n||null,yn()})}function Fe(){if(!window.showDirectoryPicker){N("当前浏览器不支持文件夹关联，请用「选择文件」");return}window.showDirectoryPicker().then(function(n){return Kn=n,p.folderName=n.name||"",mt("folder",n),Ie()}).catch(function(){})}function _t(){if(!Kn){Fe();return}Kn.queryPermission({mode:"read"}).then(function(n){return n==="granted"?Ie():Kn.requestPermission({mode:"read"}).then(function(e){if(e==="granted")return Ie();N("没有获得文件夹读取权限")})}).catch(function(){})}function Ie(){if(!Kn)return Promise.resolve();var n=[],e=["node_modules",".git"];function t(r,s){if(s>3)return Promise.resolve();var x;try{x=r.values()}catch{return Promise.resolve()}function _(){return x.next().then(function(S){if(!S.done){var M=S.value;return M.kind==="directory"?e.indexOf(M.name)>=0?_():t(M,s+1).then(_):(/\.(mp3|flac|ogg|wav|m4a|aac|opus)$/i.test(M.name)&&n.push(M.getFile().then(function(P){Mn.push({title:L(P.name),size:P.size,url:URL.createObjectURL(P)})}).catch(function(){})),_())}})}return _()}return Mn.forEach(function(r){if(r.url){var s=h.some(function(x){return x.url===r.url});if(!s&&!(i&&i.url===r.url))try{URL.revokeObjectURL(r.url)}catch{}}}),Mn=[],t(Kn,0).then(function(){p.localMeta=Mn.map(function(r){return{title:r.title,size:r.size}}),J(),N("已从「"+(p.folderName||"文件夹")+"」载入 "+Mn.length+" 首"),yn()})}function xe(){return(p.direct||[]).map(function(n){return{kind:"link",id:n.id,title:n.title,artist:n.artist||"",cover:n.cover||"",url:n.url}})}var pt=JSON.stringify([{title:"示例歌曲",artist:"歌手",cover:"https://example.com/cover.jpg",url:"https://example.com/song.mp3"}],null,2);function gt(n){var e;try{e=JSON.parse(n)}catch{N("JSON 格式不对");return}if(!Array.isArray(e)){N("歌单要是一个 JSON 数组");return}var t=0;e.forEach(function(r){!r||!r.url||!/^https?:\/\//i.test(r.url)||(p.direct.push({id:c(),title:String(r.title||L(String(r.url).split("/").pop())||"未命名"),artist:String(r.artist||""),cover:/^https?:\/\//i.test(r.cover||"")?r.cover:"",url:r.url}),t++)}),J(),N(t?"导入 "+t+" 首直链歌曲":"没有可用的条目（每条必须有 http(s) 的 url）"),yn()}var fe=["https://discoveryprovider.audius.co","https://discoveryprovider2.audius.co","https://discoveryprovider3.audius.co"],me=null;function He(n,e){return Promise.race([fetch(n).then(function(t){return t.json()}),new Promise(function(t,r){setTimeout(function(){r(new Error("超时"))},e||9e3)})])}function yt(n){var e=function(r){if(r>=fe.length)return Promise.reject(new Error("所有 Audius 节点不可达（可能被墙）"));var s=fe[r];return He(s+"/v1/tracks/search?query="+encodeURIComponent(n)+"&app_name=juice-persona&limit=30").then(function(x){var _=x&&x.data||[];return _.length?(me=s,_.filter(function(S){return S.streamable!==!1&&S.duration>0&&!S.is_delete}).map(function(S){return{kind:"search",id:"au_"+S.id,title:S.title||"未命名",artist:S.user&&S.user.name||"Audius",cover:S.artwork&&(S.artwork["480x480"]||S.artwork["150x150"])||"",url:s+"/v1/tracks/"+S.id+"/stream?app_name=juice-persona",durMs:(S.duration||0)*1e3}})):(me=s,[])}).catch(function(){return e(r+1)})};if(me){var t=me;fe=[t].concat(fe.filter(function(r){return r!==t}))}return e(0)}function St(n){var e=p.src&&p.src.jamendoKey||"";return e?He("https://api.jamendo.com/v3.0/tracks/?client_id="+encodeURIComponent(e)+"&format=json&limit=30&search="+encodeURIComponent(n)).then(function(t){if(!t||t.headers&&t.headers.status==="failed")throw new Error(t&&t.headers&&t.headers.error_message||"Jamendo 返回失败（检查 Client ID）");return(t.results||[]).map(function(r){return{kind:"search",id:"jm_"+r.id,title:r.name||"未命名",artist:r.artist_name||"Jamendo",cover:r.image||"",url:r.audio,durMs:(r.duration||0)*1e3}})}):Promise.reject(new Error("请先填写 Jamendo 免费 Client ID"))}function At(n){var e=p.src.builtin;return e==="jamendo"?St(n):yt(n)}var we=null;function gr(n){try{var e=new Function("window",`"use strict";
`+n.code+`
return (typeof MusicSource!=="undefined"&&MusicSource)||(window.MusicSource&&window.MusicSource)||null;`),t=e(window);return!t||typeof t.search!="function"?(N("音源脚本必须定义 MusicSource 对象且带 search(keyword) 函数"),!1):(we=t,N("音源「"+(t.name||n.name)+"」已加载"),!0)}catch(r){return N("音源脚本加载出错："+r.message),!1}}var An="love";function Ue(){var n=p.lists.filter(function(e){return e.id===An})[0];return n||(n={id:An,name:"我的收藏",tracks:[]},p.lists.unshift(n),J()),n}function Pn(n){return Ue(),p.lists.filter(function(e){return e.id===n})[0]||null}function Bn(n,e){var t=Pn(n);if(!t||!e)return!1;var r=Qn(e);return t.tracks.some(function(s){return Qn(s)===r})}function Qn(n){return n?n.track?n.track.source+"|"+n.track.songmid:n.id||n.title+"|"+n.artist:""}function ie(n,e){var t=Pn(n);return!t||!e||Bn(n,e)?!1:(t.tracks.push({id:e.id,title:e.title,artist:e.artist,cover:e.cover||"",source:e.source||e.track&&e.track.source||"",interval:e.interval||"",track:e.track||null,addedAt:Date.now()}),J(),!0)}function bt(n,e){var t=Pn(n);if(!t)return!1;var r=Qn(e),s=t.tracks.length;return t.tracks=t.tracks.filter(function(x){return Qn(x)!==r}),J(),t.tracks.length<s}function he(n){if(n=String(n||"").trim(),!n)return null;var e={id:"list_"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),name:n,tracks:[]};return p.lists.push(e),J(),e}function vt(n){return n===An?!1:(p.lists=p.lists.filter(function(e){return e.id!==n}),J(),!0)}function _e(n){return Bn(An,n)?(bt(An,n),!1):(ie(An,n),!0)}function kt(n){n=String(n||"").trim(),n&&(p.history=[n].concat(p.history.filter(function(e){return e!==n})).slice(0,20),J())}function It(n){return n=String(n||"").trim().toLowerCase(),n?p.history.filter(function(e){return e.toLowerCase().indexOf(n)>-1}).slice(0,8):p.history.slice(0,8)}var kn="love",jn=!1,Ee=!1,zn="",Z=!0,bn=null,Xn="",vn=[],$n=.7;function wt(n){if(n){var e=p.src.builtin==="custom"?"lx":p.src.builtin;if(e==="lx"){if(!window.LxMusic){N("音源内核未加载");return}jn=!0,zn="正在连接各平台…",z(),window.LxMusic.search(n,1,function(t){t.phase==="start"?zn="正在请求 "+t.total+" 个平台（"+(t.sources||[]).map(function(s){return Oe[s]||s}).join("/")+"）…":zn="已完成 "+t.done+"/"+t.total+" 个平台"+(t.last&&t.last.id?"（"+t.last.id+" "+t.ms+"ms）":"")+"…";var r=document.querySelector(".mu-loading-text");r&&(r.textContent=zn)}).then(function(t){jn=!1,zn="",vn=t.list.map(function(r){return{kind:"search",id:r.source+"_"+r.songmid,title:r.name,artist:r.singer,cover:r.img||"",url:"",track:r,source:r.source,interval:r.interval}}),z(),vn.length?t.errors.length?N("搜到 "+vn.length+" 首，"+t.errors.length+" 个平台失败"):N("搜到 "+vn.length+" 首"):N(t.errors.length?"没有搜到结果（"+t.errors[0].message+"）":"没有搜到结果")}).catch(function(t){jn=!1,zn="",z(),N("搜索失败："+(t&&t.message?t.message:"unknown"))});return}if(e!=="custom"){N("搜索中…"),At(n).then(function(t){vn=t.slice(0,100),yn(),vn.length||N("没有搜到结果")}).catch(function(t){N("搜索失败："+(t&&t.message?t.message:"unknown"))});return}if(!we){N("先加载一个音源脚本");return}N("搜索中…"),Promise.resolve(we.search(n)).then(function(t){var r=t&&t.items?t.items:Array.isArray(t)?t:[];vn=r.filter(function(s){return s&&s.url}).slice(0,100).map(function(s){return{kind:"search",id:c(),title:String(s.title||"未命名"),artist:String(s.artist||s.album||""),cover:/^https?:\/\//i.test(s.cover||"")?s.cover:"",url:String(s.url)}}),yn(),vn.length||N("没有搜到结果")}).catch(function(t){N("搜索失败："+(t&&t.message?t.message:"unknown"))})}}function yr(n,e){if(n){if(n.url){A([n],e,0);return}if(!n.track){N("这首没有播放地址");return}if(!window.LxMusic||!window.LxMusic.hasSource()){N("尚未导入音源脚本，无法获取播放地址");return}N("获取播放地址…");var t=p.quality||"128k";window.LxMusic.resolveUrl(n.track,t).then(function(r){if(!r){N("音源未返回地址");return}n.url=r,A([n],e,0)}).catch(function(r){N("取地址失败："+(r&&r.message?String(r.message).slice(0,60):"unknown"))})}}function Le(n,e,t){var r=Qn(n),s=!!i&&E===t&&!!r&&r===Qn(i),x=Bn(An,n),_=n.interval||(n.durMs?g(n.durMs/1e3):""),S=[n.artist,n.source?String(n.source).toUpperCase():""].filter(Boolean).join(" · "),M=s&&d&&!d.paused;return'<div class="mu-row'+(s?" active":"")+'" data-play="'+t+'" data-idx="'+e+'"><span class="mu-row-ico">'+(n.cover?'<img src="'+a(n.cover)+'" alt="" loading="lazy">':o(M?"Pause":"Play"))+'</span><span class="mu-row-main"><b>'+a(n.title)+"</b>"+(S?"<i>"+a(S)+"</i>":"")+'</span><span class="mu-row-ops"><button class="mu-love'+(x?" on":"")+'" data-love="'+e+'" title="'+(x?"取消收藏":"收藏")+'">'+o("Heart")+'</button><button class="mu-addlist" data-addlist="'+e+'" title="加入歌单">'+o("ListPlus")+"</button></span>"+(_?'<span class="mu-row-dur">'+_+"</span>":"")+"</div>"}function Sr(){var n=p.localMeta.length&&!Mn.length,e=de().map(function(t,r){return Le(t,r,"本机文件")}).join("");return'<div class="mu-panel"><h3 class="mu-h3">📁 本机音乐</h3><p class="mu-note">文件只在你自己的浏览器里读取，不会上传到任何服务器。</p><div class="mu-btns"><button class="mu-btn" id="muPickFiles">🎵 选择音乐文件</button><button class="mu-btn" id="muPickFolder">📂 关联本机文件夹'+(p.folderName?"（"+a(p.folderName)+"）":"")+"</button>"+(n?'<button class="mu-btn warn" id="muRelink">🔄 恢复上次 '+p.localMeta.length+" 首（需重新授权）</button>":"")+'</div><div class="mu-drop" id="muDrop">也可以把音乐文件直接拖到这里</div><input type="file" id="muFileInput" accept="audio/*,.mp3,.flac,.ogg,.wav,.m4a,.aac,.opus" multiple style="display:none">'+(e?'<div class="mu-list">'+e+"</div>":'<div class="mu-empty">还没有本机音乐</div>')+"</div>"}function Ar(){var n=xe().map(function(e,t){return Le(e,t,"直链歌单")}).join("");return`<div class="mu-panel"><h3 class="mu-h3">🔗 直链歌单</h3><p class="mu-note">适合放在自己网盘 / 服务器上的音乐。粘贴 JSON 数组（每条含 title 与 http(s) 的 url，可选 artist / cover）。</p><textarea class="mu-textarea" id="muJsonIn" rows="5" placeholder='[{"title":"歌名","url":"https://…/song.mp3"}]'></textarea><div class="mu-btns"><button class="mu-btn primary" id="muJsonAdd">导入歌单</button><button class="mu-btn" id="muJsonExample">填入示例</button>`+(p.direct.length?'<button class="mu-btn danger" id="muJsonClear">清空</button>':"")+"</div>"+(n?'<div class="mu-list">'+n+"</div>":'<div class="mu-empty">还没有直链歌曲</div>')+"</div>"}var br=`var MusicSource = {
  name: "我的音源",
  // 必须实现：search(keyword) 返回 [{ title, artist, cover, url }]
  // url 必须是浏览器可直接播放的音频直链（注意 CORS 与 https）
  search: function (keyword) {
    return fetch("https://你的接口?q=" + encodeURIComponent(keyword))
      .then(function (r) { return r.json(); })
      .then(function (d) { return { items: d.list || [] }; });
  }
};`,Oe={kw:"酷我",kg:"酷狗",tx:"QQ音乐",mg:"咪咕",wy:"网易云"},pe="all";function ne(){return pe==="all"?vn:vn.filter(function(n){return n.source===pe})}function Ut(){if(!vn.length)return"";var n={};vn.forEach(function(r){n[r.source]=(n[r.source]||0)+1});var e=["kw","kg","tx","mg","wy"],t=[{id:"all",label:"聚合",n:vn.length}];return e.forEach(function(r){n[r]&&t.push({id:r,label:Oe[r]||r.toUpperCase(),n:n[r]})}),'<div class="mu-src-filter">'+t.map(function(r){return'<button class="mu-src-chip'+(pe===r.id?" active":"")+'" data-src-filter="'+r.id+'">'+a(r.label)+'<span class="mu-src-chip-n">'+r.n+"</span></button>"}).join("")+"</div>"}function Et(){var n=!!window.LxMusic,e=n&&window.LxMusic.hasSource(),t="";return e||(t='<p class="mu-note warn">还没有可用的音源脚本。曲库负责搜到歌，播放地址需要音源脚本提供——去「音源」页导入一个。</p>'),'<div class="mu-panel">'+t+'<div class="mu-searchbar"><div class="mu-search-wrap"><input class="mu-input" id="muSearchKw" autocomplete="off" placeholder="歌名或歌手"><div class="mu-suggest" id="muSuggest" hidden></div></div><button class="mu-btn primary" id="muSearchBtn"'+(jn?" disabled":"")+">"+(jn?"搜索中":"搜索")+"</button></div>"+Ut()+(jn?'<div class="mu-loading"><span class="mu-spinner"></span><span class="mu-loading-text">'+a(zn||"正在搜索…")+"</span></div>":ne().length?'<div class="mu-list">'+ne().map(function(r,s){return Le(r,s,"搜索结果")}).join("")+"</div>":'<div class="mu-empty">搜点什么听听——支持歌名 / 歌手</div>')+"</div>"}var _n=-1;pn=null;var pn=null,gn=null,In="default",Wn=!0;function Lt(){if(_n<0)return"";Ue();var n=p.lists.map(function(e){return'<button class="mu-pick-list" data-pick-list="'+e.id+'">'+a(e.name)+'<span class="mu-pick-count">'+e.tracks.length+"</span></button>"}).join("");return'<div class="mu-modal-mask" id="muAddListMask"><div class="mu-modal-box"><h4 class="mu-modal-title">加入歌单</h4><div class="mu-pick-lists">'+n+'</div><div class="mu-modal-ops"><button class="mu-btn" id="muPickNew">新建歌单</button><button class="mu-btn" id="muPickCancel">取消</button></div></div></div>'}function Jt(n){var e=n.map(function(r,s){return{track:r,index:s}});if(In==="default")return e;var t;return In==="title"?t=function(r,s){return String(r.track.title||"").localeCompare(String(s.track.title||""),"zh-Hans-CN")}:In==="artist"?t=function(r,s){return String(r.track.artist||"").localeCompare(String(s.track.artist||""),"zh-Hans-CN")}:t=function(r,s){return(Number(r.track.addedAt)||0)-(Number(s.track.addedAt)||0)},e.sort(function(r,s){var x=t(r,s);return x===0?r.index-s.index:Wn?x:-x}),e}function Ct(){var n={default:"默认",title:"字母",artist:"歌手",added:"时间"}[In],e=In==="default"?"":Wn?"↑":"↓";return'<button class="mu-btn mini mu-sort-btn'+(In!=="default"?" on":"")+'" id="muListSort" title="排序：'+n+'">'+o("ArrowUpDown")+n+e+"</button>"}function qt(){Ue();var n=p.lists.filter(function(s){return s.id===kn})[0]||p.lists[0];n&&(kn=n.id);var e=p.lists.map(function(s){var x=n&&s.id===n.id;return'<button class="mu-list-tab'+(x?" active":"")+'" data-list-tab="'+s.id+'">'+a(s.name)+'<span class="mu-list-count">'+s.tracks.length+"</span></button>"}).join(""),t="";if(n&&n.tracks.length){var r=Jt(n.tracks);t='<div class="mu-list">'+r.map(function(s){var x=s.track,_=s.index,S=!!i&&Qn(i)===Qn(x),M=x.track||x,P=[x.artist||M.singer,String(M.source||x.source||"").toUpperCase()].filter(Boolean).join(" · "),H=x.interval||M.interval||"";return'<div class="mu-row'+(S?" active":"")+'" data-list-play="'+_+'"><span class="mu-row-ico">'+(x.cover||M.img?'<img src="'+a(x.cover||M.img)+'" alt="" loading="lazy">':o(S&&d&&!d.paused?"Pause":"Play"))+'</span><span class="mu-row-main"><b>'+a(x.title)+"</b>"+(P?"<i>"+a(P)+"</i>":"")+"</span>"+(H?'<span class="mu-row-dur">'+a(H)+"</span>":"")+'<span class="mu-row-ops"><button class="mu-addlist" data-list-remove="'+_+'" title="从歌单移除">'+o("X")+"</button></span></div>"}).join("")+"</div>"}else t='<div class="mu-empty">'+(n&&n.id===An?"在搜索结果里点 ♡ 收藏喜欢的歌":"这个歌单还是空的")+"</div>";return'<div class="mu-panel"><div class="mu-list-head"><div class="mu-list-tabs">'+e+'</div><div class="mu-list-actions">'+Ct()+'<button class="mu-btn mini" id="muListImport" title="从分享链接导入歌单">'+o("Link")+'导入</button><button class="mu-btn mini" id="muListNew" title="新建歌单">'+o("Plus")+"新建</button>"+(n&&n.id!==An?'<button class="mu-btn mini" id="muListRename" title="重命名歌单">'+o("Pencil")+'改名</button><button class="mu-btn mini danger" id="muListDel" title="删除此歌单">'+o("Trash2")+"删除</button>":"")+"</div></div>"+Tt(n)+t+"</div>"}function Tt(n){if(!gn||!n||n.id!==gn.listId)return"";var e=gn.total?Math.round(gn.done/gn.total*100):0;return'<div class="mu-import-banner"><div class="mu-import-row"><span class="mu-spinner"></span><span class="mu-import-text">正在导入 '+gn.done+"/"+gn.total+' 首</span><span class="mu-import-pct">'+e+'%</span></div><div class="mu-import-track"><i style="width:'+e+'%"></i></div></div>'}function Mt(){var n=!!window.LxMusic,e=n?window.LxMusic.listScripts():[],t=n?window.LxMusic.listLoaded():[],r={};e.forEach(function(P){r[P.name]=P});var s={},x=t.filter(function(P){return s[P.name]?!1:(s[P.name]=1,!0)}).map(function(P){var H=r[P.name];return'<div class="mu-src on"><b>'+a(P.name)+(H&&H.version?' <span class="mu-src-ver">'+a(H.version)+"</span>":"")+'</b><span class="mu-src-ops"><span class="mu-src-tag">已加载</span>'+(H?'<button class="mu-btn mini danger" data-lx-del="'+a(H.id)+'">删除</button>':"")+"</span></div>"}).join(""),_=e.filter(function(P){return!s[P.name]}).map(function(P){return'<div class="mu-src"><b>'+a(P.name)+(P.version?' <span class="mu-src-ver">'+a(P.version)+"</span>":"")+'</b><span class="mu-src-ops"><span class="mu-src-tag">未加载</span><button class="mu-btn mini danger" data-lx-del="'+a(P.id)+'">删除</button></span></div>'}).join("");x=x+_;var S=Object.keys(s).length,M="";return S?M='<p class="mu-note ok">已加载 '+S+" 个音源</p>":M='<p class="mu-note warn">还没有可用的音源，导入一个 .js 脚本才能播放</p>','<div class="mu-panel"><p class="mu-note">音源脚本只负责把歌名换成播放地址，搜索由内置的多平台接口完成。脚本只存在你本机浏览器，本站服务器不经手任何脚本内容。</p>'+M+'<div class="mu-btns"><button class="mu-btn primary" id="muLxPickFile">导入 .js 文件</button><input type="file" id="muLxFileInput" accept=".js,text/javascript" hidden></div><textarea class="mu-textarea mono" id="muLxCode" rows="6" placeholder="或直接粘贴脚本内容…"></textarea><div class="mu-btns"><button class="mu-btn primary" id="muLxAdd">保存并加载</button></div>'+(x?'<div class="mu-src-list">'+x+"</div>":'<div class="mu-empty">还没有导入音源脚本</div>')+"</div>"}function Bt(){var n=d&&i&&!d.paused,e=i&&i.cover,t=p.volume<=0,r=ee(),s={one:"Repeat1",all:"Repeat",shuffle:"Shuffle"}[r],x={one:"单曲循环",all:"顺序播放",shuffle:"随机播放"}[r];return'<div class="mu-player"><div class="mu-bar"><span class="mu-time mu-time-cur">0:00</span><div class="mu-bar-progress"><i></i></div><input type="range" class="mu-seek" min="0" step="0.1" value="0"><span class="mu-time mu-time-dur">0:00</span></div><div class="mu-disc'+(n&&e?" spin":"")+'" id="muDisc" title="全屏播放">'+(e?'<img src="'+a(e)+'" alt="">':o("Play"))+(i&&i.loading?'<span class="mu-disc-spinner">'+o("Loader")+"</span>":"")+'</div><div class="mu-player-title">'+(i?a(i.title):"未在播放")+(i&&i.artist?" <i>· "+a(i.artist)+"</i>":"")+(i&&i.loading?'<span class="mu-loading-tip">正在加载…</span>':"")+'</div><div class="mu-ops mu-ops-main"><button class="mu-op" id="muPrev" title="上一首">'+o("SkipBack")+'</button><button class="mu-op big" id="muToggle" title="播放/暂停" data-morph="'+(n?"Pause":"Play")+'">'+o(n?"Pause":"Play")+'</button><button class="mu-op" id="muNext" title="下一首">'+o("SkipForward")+'</button></div><div class="mu-player-lyric" id="muBarLyric"></div><div class="mu-player-time"><span class="mu-pt-cur" id="muPtCur">0:00</span><span class="mu-pt-sep">/</span><span class="mu-pt-dur" id="muPtDur">0:00</span></div><div class="mu-ops mu-ops-side"><button class="mu-op'+(r!=="all"?" on":"")+'" id="muMode" title="'+x+'">'+o(s)+'</button><span class="mu-imm-vol"><button class="mu-op" id="muMute" title="'+(t?"取消静音":"静音")+'">'+o(t?"VolumeX":"Volume2")+'</button><span class="mu-imm-vol-pop"><span class="mu-imm-vol-num" id="muBarVolNum">'+Math.round(p.volume*100)+'</span><input type="range" class="mu-imm-vol-range mu-vol" min="0" max="1" step="0.01" value="'+p.volume+'" orient="vertical" aria-label="音量"></span></span><button class="mu-op'+(i&&Bn(An,{track:i.track||i})?" on":"")+'" id="muBarLove" title="收藏">'+o("Heart")+'</button><button class="mu-op lyric-btn'+(Z?" on":"")+'" id="muBarLyricBtn" title="'+(Z?"隐藏歌词":"显示歌词")+'"><span class="mu-lyric-glyph'+(Z?"":" off")+'">词</span></button><button class="mu-op" id="muQueueBtn" title="当前播放列表">'+o("ListMusic")+'</button><button class="mu-op imm" id="muImmersive" title="全屏播放">'+o("Maximize2")+"</button></div></div>"}function ee(){return p.shuffle?"shuffle":p.repeat==="one"?"one":"all"}function Ge(){var n={one:"all",all:"shuffle",shuffle:"one"}[ee()];p.shuffle=n==="shuffle",p.repeat=n==="one"?"one":"all",J(),z(),N({one:"单曲循环",all:"顺序播放",shuffle:"随机播放"}[n])}function Rt(){var n=[["search","搜索"],["rank","排行榜"],["lists","我的列表"],["script","音源"]];return'<div class="mu-wrap"><div class="mu-header"><div class="mu-mark">'+o("Play")+'</div><div class="mu-headtext"><h2 class="mu-title">我的音乐台</h2><p class="mu-sub">'+Je()+'</p></div></div><div class="mu-tabs">'+n.map(function(e){return'<button class="mu-tab'+(B===e[0]?" active":"")+'" data-mu-tab="'+e[0]+'">'+e[1]+"</button>"}).join("")+"</div>"+(B==="rank"?Nt():B==="search"?Et():B==="lists"?qt():Mt())+"</div>"}var rn={ranks:null,openRank:null,songs:null,loading:!1};function Nt(){var n=rn.ranks;if(n===null)return'<div class="mu-panel"><div class="mu-loading"><span class="mu-spinner"></span><span>正在加载排行榜…</span></div></div>';if(!n.length)return'<div class="mu-panel"><div class="mu-empty">排行榜加载失败，稍后再试</div></div>';var e=rn.openRank,t=n.map(function(x){var _=e&&String(e.id)===String(x.id);return'<button class="mu-rank-side-item'+(_?" active":"")+'" data-rank="'+x.id+'" data-rank-name="'+a(x.name)+'"><span class="mu-rank-side-art">'+(x.cover?'<img src="'+a(x.cover)+'" alt="" loading="lazy">':o("Trophy"))+'</span><span class="mu-rank-side-name">'+a(x.name)+"</span></button>"}).join(""),r;if(!e)r='<div class="mu-empty">从左边选一个榜单</div>';else if(rn.loading)r='<div class="mu-loading"><span class="mu-spinner"></span><span>正在加载榜单…</span></div>';else{var s=rn.songs||[];r=s.length?'<div class="mu-rank-main-head"><h3>'+a(e.name)+"</h3><span>"+s.length+' 首</span></div><div class="mu-list">'+s.map(function(x,_){var S=Bn(An,{track:x});return'<div class="mu-row" data-rank-play="'+_+'"><span class="mu-row-ico">'+(x.img?'<img src="'+a(x.img)+'" alt="" loading="lazy">':o("Play"))+'</span><span class="mu-row-main"><b>'+a(x.name)+"</b><i>"+a(x.singer)+'</i></span><span class="mu-row-ops"><button class="mu-love'+(S?" on":"")+'" data-rank-love="'+_+'" title="'+(S?"取消收藏":"收藏")+'">'+o("Heart")+'</button><button class="mu-addlist" data-rank-addlist="'+_+'" title="加入列表">'+o("ListPlus")+"</button></span>"+(x.interval?'<span class="mu-row-dur">'+a(x.interval)+"</span>":"")+"</div>"}).join("")+"</div>":'<div class="mu-empty">这个榜单暂时取不到歌曲</div>'}return'<div class="mu-panel"><div class="mu-rank-split"><div class="mu-rank-side">'+t+'</div><div class="mu-rank-main">'+r+"</div></div></div>"}function Pt(){window.LxDiscover&&(!rn.ranks||!rn.ranks.length)&&(rn.rankLoading||(rn.rankLoading=!0,window.LxDiscover.listRanks().then(function(n){rn.rankLoading=!1,rn.ranks=n&&n.length?n:null,B==="rank"&&z()}).catch(function(){rn.rankLoading=!1})))}function Qt(n,e){rn.openRank={id:n,name:e},rn.songs=null,rn.loading=!0,z(),window.LxDiscover&&window.LxDiscover.rankSongs(n,1,60).then(function(t){!rn.openRank||rn.openRank.id!==n||(rn.songs=t,rn.loading=!1,z())})}function Ft(){var n=document.getElementById("muAddListMask");if(n&&n.remove(),!(_n<0)){var e=document.createElement("div");e.innerHTML=Lt();var t=e.firstElementChild;t&&document.body.appendChild(t)}}var oe=!1;function Je(){if(!window.LxMusic)return"音源未就绪";var n=window.LxMusic.listLoaded?window.LxMusic.listLoaded():[],e={};n.forEach(function(r){e[r.name]=1});var t=Object.keys(e).length;return t?"已加载 "+t+" 个音源":oe?"正在加载音源…":"未加载音源"}function Ce(){var n=document.querySelector(".mu-sub");if(n&&(n.textContent=Je()),B==="search"){var e=document.querySelector(".mu-panel");if(e){var t=e.querySelector(".mu-note.warn"),r=!!(window.LxMusic&&window.LxMusic.hasSource());if(r&&t)t.remove();else if(!r&&!t){var s=document.createElement("p");s.className="mu-note warn",s.textContent="还没有可用的音源脚本。曲库负责搜到歌，播放地址需要音源脚本提供——去「音源」页导入一个。",e.insertBefore(s,e.firstChild)}}}if(B==="script"){var x=document.querySelector(".mu-panel .mu-note.ok, .mu-panel .mu-note.warn");x&&(x.outerHTML='<p class="mu-note '+(window.LxMusic&&window.LxMusic.hasSource()?"ok":"warn")+'">'+Je()+"</p>")}}function yn(){U&&document.getElementById("mod-music").classList.contains("active")&&z(),Nn()}function z(){if(U){var n=U.querySelector("#muSearchKw"),e=n?n.value:"",t=n&&document.activeElement===n;if(U.innerHTML=Rt(),Ht(),Ft(),Yt(),V(),u(U),u(document.getElementById("muPlayerBar")),u(document.getElementById("muAddListMask")),e){var r=U.querySelector("#muSearchKw");r&&(r.value=e,t&&(Ee=!0,r.focus(),Ee=!1))}}}function Ht(){var n=document.getElementById("muPlayerBar");n&&n.remove();var e=Bt(),t=document.createElement("div");t.innerHTML=e;var r=t.firstElementChild;r&&(r.id="muPlayerBar",document.body.appendChild(r),Dt(r),i&&(Fn(),i.loading&&Yn(!0)),Un())}function Un(){var n=document.getElementById("muPlayerBar");if(n){var e=document.getElementById("mod-music"),t=!!(e&&e.classList.contains("active"));n.style.display=t||O?"":"none",Nn()}}function Fn(){var n=document.getElementById("muPlayerBar");if(n){var e=n.querySelector(".mu-player-title");if(e)if(e.innerHTML=(i?a(i.title):"未在播放")+(i&&i.artist?" <i>· "+a(i.artist)+"</i>":""),i&&i.loading){var t=document.createElement("span");t.className="mu-loading-tip",t.textContent="正在加载…",e.appendChild(t),n.classList.add("loading")}else n.classList.remove("loading");var r=n.querySelector("#muDisc");if(r&&(r.innerHTML=i&&i.cover?'<img src="'+a(i.cover)+'" alt="">':o("Play"),u(r),i&&i.loading)){var s=document.createElement("span");s.className="mu-disc-spinner",s.innerHTML=o("Loader"),r.appendChild(s),u(s),n.classList.add("loading")}}}var De=new WeakMap;function Ke(n,e,t){if(!n||!window.MorphDOM||!window.LUCIDE_ICONS)return!1;var r=n.querySelector("svg");if(!r)return!1;var s=window.LUCIDE_ICONS[e],x=window.LUCIDE_ICONS[t];if(!s||!x||s.length!==1||x.length!==1||s[0][0]!=="path"||x[0][0]!=="path")return!1;try{var _=De.get(r);if(!_){for(;r.firstChild;)r.removeChild(r.firstChild);var S=document.createElementNS("http://www.w3.org/2000/svg","path"),M=s[0][1]||{};for(var P in M)S.setAttribute(P,M[P]);S.setAttribute("fill","none"),S.setAttribute("stroke","currentColor"),S.setAttribute("stroke-width","2"),S.setAttribute("stroke-linecap","round"),S.setAttribute("stroke-linejoin","round"),r.appendChild(S),_=window.MorphDOM.createMorph(S,s,{}),De.set(r,_)}return _.set(x),!0}catch{return!1}}function qe(n,e){n&&(n.innerHTML=o(e),u(n))}var Ot={Play:"PlayPath",Pause:"PausePath",Volume2:"VolumePath",VolumeX:"MutePath",Eye:"EyePath",EyeOff:"EyeOffPath",Heart:"HeartPath"};function ge(n){return Ot[n]||n}function Gt(n){var e=document.getElementById("muPlayerBar"),t=e&&e.querySelector("#muToggle"),r=n?"Pause":"Play";if(t){var s=t.getAttribute("data-morph")||"Play";Ke(t,ge(s),ge(r))||qe(t,r),t.setAttribute("data-morph",r)}var x=O&&O.querySelector('[data-imm="toggle"]');if(x){var _=x.getAttribute("data-morph")||"Play";Ke(x,ge(_),ge(r))||qe(x,r),x.setAttribute("data-morph",r)}}function Te(){var n=document.getElementById("muPlayerBar"),e=n&&n.querySelector("#muMute");if(e){var t=p.volume<=0,r=t?"VolumeX":"Volume2";qe(e,r),e.title=t?"取消静音":"静音"}}function Yn(n){var e=document.getElementById("muPlayerBar");if(e){e.classList.toggle("loading",!!n);var t=e.querySelector("#muDisc");if(t){var r=t.querySelector(".mu-disc-spinner");n?r||(r=document.createElement("span"),r.className="mu-disc-spinner",r.innerHTML=o("Loader"),t.appendChild(r),u(r)):r&&r.remove()}var s=e.querySelector(".mu-player-title");if(s){var x=s.querySelector(".mu-loading-tip");n?x||(x=document.createElement("span"),x.className="mu-loading-tip",x.textContent="正在加载…",s.appendChild(x)):x&&x.remove()}}}function je(n){!n||n._volWheelBound||(n._volWheelBound=!0,n.addEventListener("wheel",function(e){e.preventDefault(),e.stopPropagation();var t=(e.deltaY<0?1:-1)*.04;Tn(p.volume+t)},{passive:!1}))}function ye(){if(O){var n=p.volume<=0,e=O.querySelector('[data-imm="mute"]');e&&(e.innerHTML=o(n?"VolumeX":"Volume2"),u(e),e.title=n?"取消静音":"静音");var t=O.querySelector(".mu-imm-vol-range");t&&document.activeElement!==t&&(t.value=String(p.volume));var r=O.querySelector("#muImmVolNum");r&&(r.textContent=String(Math.round(p.volume*100)))}}function Dt(n){var e=n.querySelector("#muToggle");e&&(e.onclick=W);var t=n.querySelector("#muPrev");t&&(t.onclick=ln);var r=n.querySelector("#muNext");r&&(r.onclick=function(){nn(!1)});var s=n.querySelector("#muMode");s&&(s.onclick=Ge);var x=n.querySelector("#muMute");x&&(x.onclick=function(){p.volume>0?($n=p.volume,Tn(0)):Tn($n>0?$n:.7),Te()});var _=n.querySelector(".mu-seek");_&&(_.oninput=function(){d&&d.duration&&(d.currentTime=parseFloat(_.value))});var S=n.querySelector("#muImmersive");S&&(S.onclick=Ye);var M=n.querySelector("#muQueueBtn");M&&(M.onclick=ze);var P=n.querySelector("#muBarLove");P&&(P.onclick=function(){if(!i){N("还没有在播的歌");return}var xn=_e({id:i.id,title:i.title,artist:i.artist,cover:i.cover||"",source:i.source||"",interval:i.interval||"",track:i.track||null});P.classList.toggle("on",xn);var $=P.querySelector("svg");$&&$.classList.toggle("on",xn),N(xn?"已收藏":"已取消收藏")});var H=n.querySelector("#muBarLyricBtn");H&&(H.onclick=function(){Z=!Z;try{localStorage.setItem("juice_music_show_lyric",Z?"1":"0")}catch{}H.classList.toggle("on",Z),H.title=Z?"隐藏歌词":"显示歌词";var xn=H.querySelector(".mu-lyric-glyph");xn&&xn.classList.toggle("off",!Z);var $=document.getElementById("muBarLyric");if($&&($.style.display=Z?"":"none"),Z||(ae=""),O){var Gn=O.querySelector("#muImmLyric"),Zn=O.querySelector('[data-imm="lyric"]');if(Gn&&Gn.classList.toggle("hidden",!Z),Zn){Zn.classList.toggle("on",Z),Zn.title=Z?"隐藏歌词":"显示歌词";var Sn=Zn.querySelector(".mu-lyric-glyph");Sn&&Sn.classList.toggle("off",!Z)}Z&&Gn&&(Gn.innerHTML=Se(),se(Gn),Rn=-1,ce(d?d.currentTime:0))}});var mn=n.querySelector(".mu-vol");mn&&(mn.oninput=function(){Tn(parseFloat(mn.value))}),je(n.querySelector(".mu-imm-vol"));var Cn=n.querySelector("#muDisc");Cn&&(Cn.onclick=Ye,Cn.style.cursor="pointer")}var en=null;function ze(n){if(en){Hn();return}if(!h.length){N("播放列表是空的");return}Kt(n)}function Kt(n){Hn(),en=document.createElement("div"),en.className="mu-queue-mask"+(n||O?" in-immersive":""),en.innerHTML=jt(),document.body.appendChild(en),u(en),Me(en),en.querySelectorAll("[data-q-jump]").forEach(function(t){t.onclick=function(){var r=parseInt(t.getAttribute("data-q-jump"),10);if(isNaN(r)||r===w){Hn();return}w=r,T(),On()}});var e=en.querySelector("#muQueueClear");e&&(e.onclick=function(){try{d.pause(),d.removeAttribute("src"),d.load()}catch{}i=null,h=[],w=-1,E="",f(),Hn(),Ln(!1),Fn(),Un(),yn(),N("已清空播放列表")}),en.querySelector(".mu-queue-close").onclick=Hn,en.onclick=function(t){t.target===en&&Hn()}}function Hn(){en&&(en.remove(),en=null)}function On(){if(en){var n=en.querySelector(".mu-queue-body");n&&(n.innerHTML=We()),u(en),n&&Me(n),en.querySelectorAll("[data-q-jump]").forEach(function(t){t.onclick=function(r){if(!(r.target.closest(".mu-queue-grip")||r.target.closest("[data-q-del]"))){var s=parseInt(t.getAttribute("data-q-jump"),10);if(isNaN(s)||s===w){Hn();return}w=s,T(),On()}}});var e=en.querySelector(".mu-queue-row.active");e&&e.scrollIntoView({block:"center"})}}function jt(){return'<div class="mu-queue-panel"><div class="mu-queue-head"><div class="mu-queue-title"><b>当前播放</b><span>'+(E?a(E)+" · ":"")+h.length+' 首</span></div><div class="mu-queue-ops"><button class="mu-btn mini" id="muQueueClear" title="清空播放列表">'+o("Trash2")+'清空</button><button class="mu-op mu-queue-close" title="关闭">'+o("X")+'</button></div></div><div class="mu-queue-body">'+We()+"</div></div>"}function We(){return h.map(function(n,e){var t=e===w;return'<div class="mu-queue-row'+(t?" active":"")+'" data-q-jump="'+e+'" draggable="true" data-q-index="'+e+'"><span class="mu-queue-grip" title="拖动排序">'+o("GripVertical")+'</span><span class="mu-queue-idx">'+(t?o("Volume2"):e+1)+'</span><span class="mu-queue-text"><b>'+a(n.title||"未知曲目")+"</b>"+(n.artist?"<i>"+a(n.artist)+"</i>":"")+"</span>"+(n.interval?'<span class="mu-queue-dur">'+a(n.interval)+"</span>":"")+'<button class="mu-queue-del" data-q-del="'+e+'" title="从播放列表移除">'+o("X")+"</button></div>"}).join("")}var Vn=-1;function Me(n){n.querySelectorAll("[data-q-del]").forEach(function(t){t.addEventListener("click",function(r){r.stopPropagation();var s=parseInt(t.getAttribute("data-q-del"),10);zt(s)})});var e=n.querySelectorAll("[data-q-index]");e.forEach(function(t){t.addEventListener("dragstart",function(r){Vn=parseInt(t.getAttribute("data-q-index"),10),t.classList.add("dragging");try{r.dataTransfer.effectAllowed="move",r.dataTransfer.setData("text/plain",String(Vn))}catch{}}),t.addEventListener("dragend",function(){t.classList.remove("dragging"),n.querySelectorAll(".drag-over").forEach(function(r){r.classList.remove("drag-over")})}),t.addEventListener("dragover",function(r){if(!(Vn<0)){r.preventDefault();try{r.dataTransfer.dropEffect="move"}catch{}t.classList.add("drag-over")}}),t.addEventListener("dragleave",function(){t.classList.remove("drag-over")}),t.addEventListener("drop",function(r){r.preventDefault(),t.classList.remove("drag-over");var s=parseInt(t.getAttribute("data-q-index"),10);Vn<0||isNaN(s)||Vn===s||(Wt(Vn,s),Vn=-1)})})}function zt(n){if(!(n<0||n>=h.length)){var e=n===w;if(h.splice(n,1),!h.length){try{d.pause(),d.removeAttribute("src"),d.load()}catch{}i=null,w=-1,E="",Yn(!1),Ln(!1),Fn(),Un(),yn(),Hn(),f(),N("播放列表已清空");return}e?(w>=h.length&&(w=h.length-1),T()):n<w&&w--,f(),On(),B==="lists"&&z(),N("已从播放列表移除")}}function Wt(n,e){if(!(n===e||n<0||e<0||n>=h.length||e>=h.length)){var t=h[w],r=h.splice(n,1)[0];h.splice(e,0,r);var s=h.indexOf(t);if(s>-1&&(w=s),f(),On(),en){var x=en.querySelector(".mu-queue-body");x&&Me(x)}}}function Yt(){U.querySelectorAll("[data-mu-tab]").forEach(function(k){k.onclick=function(){B=k.getAttribute("data-mu-tab"),_n=-1,pn=null,z()}}),U.querySelectorAll("[data-play]").forEach(function(k){k.onclick=function(F){if(!(F.target.closest("[data-love]")||F.target.closest("[data-addlist]"))){var Y=k.getAttribute("data-play"),j=parseInt(k.getAttribute("data-idx"),10),sn=Y==="本机文件"?de():Y==="直链歌单"?xe():ne(),tn=sn[j];if(tn){var X={kind:Y==="搜索结果"?"search":"local",id:tn.id||(tn.source||"")+"_"+(tn.songmid||tn.title),title:tn.title,artist:tn.artist||"",cover:tn.cover||"",url:tn.url||"",track:tn.track||null,source:tn.source||"",interval:tn.interval||""},Dn=h.length>0&&E&&E!==Y;if(Dn&&Y==="搜索结果"){q(X);return}var _r=sn.map(function(En){return{kind:Y==="搜索结果"?"search":"local",id:En.id||(En.source||"")+"_"+(En.songmid||En.title),title:En.title,artist:En.artist||"",cover:En.cover||"",url:En.url||"",track:En.track||null,source:En.source||"",interval:En.interval||""}});A(_r,Y,j)}}}});var n=U.querySelector("#muPickFiles"),e=U.querySelector("#muFileInput");n&&e&&(n.onclick=function(){e.click()},e.onchange=function(){Qe(e.files)});var t=U.querySelector("#muPickFolder");t&&(t.onclick=Fe);var r=U.querySelector("#muRelink");r&&(r.onclick=_t);var s=U.querySelector("#muDrop");s&&(s.onclick=function(){e&&e.click()},["dragover","dragenter"].forEach(function(k){s.addEventListener(k,function(F){F.preventDefault(),s.classList.add("over")})}),["dragleave","drop"].forEach(function(k){s.addEventListener(k,function(F){F.preventDefault(),s.classList.remove("over")})}),s.addEventListener("drop",function(k){k.dataTransfer&&k.dataTransfer.files&&Qe(k.dataTransfer.files)}));var x=U.querySelector("#muJsonAdd"),_=U.querySelector("#muJsonIn");x&&_&&(x.onclick=function(){gt(_.value),_.value=""});var S=U.querySelector("#muJsonExample");S&&_&&(S.onclick=function(){_.value=pt});var M=U.querySelector("#muJsonClear");M&&(M.onclick=function(){p.direct=[],J(),z(),N("直链歌单已清空")}),U.querySelectorAll("[data-builtin]").forEach(function(k){k.onclick=function(){p.src.builtin=k.getAttribute("data-builtin"),J(),z()}});var P=U.querySelector("#muJmKeySave"),H=U.querySelector("#muJmKey");P&&H&&(P.onclick=function(){p.src.jamendoKey=H.value.trim(),J(),N(p.src.jamendoKey?"Client ID 已保存":"Client ID 已清空")});var mn=U.querySelector("#muLxAdd"),Cn=U.querySelector("#muLxCode"),xn=U.querySelector("#muLxPickFile"),$=U.querySelector("#muLxFileInput");function Gn(k){if(!window.LxMusic){N("音源内核未加载");return}N("导入中…"),window.LxMusic.importScript(k).then(function(F){N("已导入："+F.name+"（"+F.sources.join("/")+"）"),z()}).catch(function(F){N("导入失败："+(F&&F.message?F.message:"unknown"))})}mn&&Cn&&(mn.onclick=function(){var k=Cn.value;if(!k.trim()){N("先粘贴脚本内容");return}Gn(k)}),xn&&$&&(xn.onclick=function(){$.click()},$.onchange=function(){var k=$.files&&$.files[0];if(k){var F=new FileReader;F.onload=function(){Gn(String(F.result||""))},F.onerror=function(){N("读取文件失败")},F.readAsText(k)}}),U.querySelectorAll("[data-lx-del]").forEach(function(k){k.onclick=function(F){F.stopPropagation(),window.LxMusic&&(window.LxMusic.removeScript(k.getAttribute("data-lx-del")),N("已删除"),z())}});var Zn=U.querySelector("#muSearchBtn"),Sn=U.querySelector("#muSearchKw"),fn=U.querySelector("#muSuggest"),Be=null,rt=0;function ve(){if(!fn||!Sn)return;if(jn||Ee){fn.hidden=!0,fn.innerHTML="";return}var k=Sn.value.trim(),F=It(k),Y=++rt;function j(sn){if(Y===rt){var tn="";if(sn&&sn.length&&(tn+='<div class="mu-suggest-head">搜索建议</div>'+sn.map(function(X){return'<div class="mu-suggest-item" data-sug="'+a(X)+'">'+o("Search")+a(X)+"</div>"}).join("")),!k&&F.length&&(tn+='<div class="mu-suggest-head mu-suggest-head-row">搜索历史<button class="mu-suggest-clear" id="muHistoryClear" title="清空搜索历史">清空</button></div>'+F.map(function(X){return'<div class="mu-suggest-item" data-sug="'+a(X)+'">'+o("History")+a(X)+'<button class="mu-suggest-del" data-sug-del="'+a(X)+'" title="删除这条">'+o("X")+"</button></div>"}).join("")),!tn){fn.hidden=!0,fn.innerHTML="";return}fn.innerHTML=tn,u(fn),fn.hidden=!1}}j([]),k&&(!window.LxMusic||!window.LxMusic.tipSearch||window.LxMusic.tipSearch(k).then(function(sn){j(sn)}).catch(function(){}))}Sn&&(Sn.oninput=function(){Be&&clearTimeout(Be),Be=setTimeout(ve,250)},Sn.onfocus=ve,Sn.onkeydown=function(k){k.key==="Enter"?(fn&&(fn.hidden=!0),Re(Sn.value.trim())):k.key==="Escape"&&fn&&(fn.hidden=!0)});function Re(k){k&&(fn&&(fn.hidden=!0,fn.innerHTML=""),kt(k),wt(k))}Zn&&Sn&&(Zn.onclick=function(){Re(Sn.value.trim())}),fn&&(fn.onclick=function(k){var F=k.target.closest("[data-sug-del]");if(F){k.stopPropagation();var Y=F.getAttribute("data-sug-del");p.history=p.history.filter(function(tn){return tn!==Y}),J(),ve();return}if(k.target.closest("#muHistoryClear")){k.stopPropagation(),p.history=[],J(),ve();return}var j=k.target.closest("[data-sug]");if(j){var sn=j.getAttribute("data-sug");Sn&&(Sn.value=sn),fn.hidden=!0,Re(sn)}}),U.querySelectorAll("[data-love]").forEach(function(k){k.onclick=function(F){F.stopPropagation();var Y=parseInt(k.getAttribute("data-love"),10),j=ne()[Y];if(j){var sn=_e(j);N(sn?"已收藏":"已取消收藏"),z()}}}),U.querySelectorAll("[data-addlist]").forEach(function(k){k.onclick=function(F){F.stopPropagation(),_n=parseInt(k.getAttribute("data-addlist"),10),z()}});var Ne=document.getElementById("muAddListMask");Ne&&(Ne.onclick=function(k){k.target===Ne&&(_n=-1,pn=null,z())}),document.querySelectorAll("[data-pick-list]").forEach(function(k){k.onclick=function(){var F=k.getAttribute("data-pick-list"),Y=pn||ne()[_n];if(!Y){_n=-1,pn=null,pn=null,z();return}var j=Pn(F);if(!j){_n=-1,pn=null,z();return}Bn(F,Y)?N("已在「"+j.name+"」里"):(ie(F,Y),N("已加入「"+j.name+"」")),_n=-1,pn=null,z()}});var at=document.getElementById("muPickNew");at&&(at.onclick=function(){re("新建歌单","歌单名称","",function(k){if(k){var F=he(k),Y=pn||ne()[_n];F&&Y&&(ie(F.id,Y),N("已加入「"+F.name+"」")),_n=-1,pn=null,z()}})});var it=document.getElementById("muPickCancel");it&&(it.onclick=function(){_n=-1,pn=null,z()}),B==="rank"&&Pt(),B==="rank"&&(U.querySelectorAll("[data-rank]").forEach(function(k){k.onclick=function(){Qt(k.getAttribute("data-rank"),k.getAttribute("data-rank-name")||"")}}),U.querySelectorAll("[data-rank-play]").forEach(function(k){k.onclick=function(F){if(!(F.target.closest("[data-rank-love]")||F.target.closest("[data-rank-addlist]"))){var Y=parseInt(k.getAttribute("data-rank-play"),10),j=rn.songs||[];if(j[Y]){var sn=rn.openRank?rn.openRank.name:"排行榜",tn=j.map(function(X){return{kind:"rank",id:"kg_"+(X.hash||X.songmid),title:X.name,artist:X.singer,cover:X.img||"",url:"",track:X,source:"kg",interval:X.interval}});A(tn,sn,Y)}}}}),U.querySelectorAll("[data-rank-love]").forEach(function(k){k.onclick=function(F){F.stopPropagation();var Y=parseInt(k.getAttribute("data-rank-love"),10),j=(rn.songs||[])[Y];if(j){var sn={id:"kg_"+(j.hash||j.songmid),title:j.name,artist:j.singer,cover:j.img||"",source:"kg",interval:j.interval,track:j},tn=_e(sn);N(tn?"已收藏":"已取消收藏"),z()}}}),U.querySelectorAll("[data-rank-addlist]").forEach(function(k){k.onclick=function(F){F.stopPropagation();var Y=parseInt(k.getAttribute("data-rank-addlist"),10),j=(rn.songs||[])[Y];if(j){var sn={id:"kg_"+(j.hash||j.songmid),title:j.name,artist:j.singer,cover:j.img||"",source:"kg",interval:j.interval,track:j};pn=sn,_n=0,z()}}})),U.querySelectorAll("[data-list-tab]").forEach(function(k){k.onclick=function(){kn=k.getAttribute("data-list-tab"),z()}}),U.querySelectorAll("[data-list-play]").forEach(function(k){k.onclick=function(F){if(!F.target.closest("[data-list-remove]")){var Y=parseInt(k.getAttribute("data-list-play"),10),j=Pn(kn);if(j){var sn=j.tracks[Y];if(sn){var tn=j.tracks.map(function(X){var Dn=X.track||X;return{kind:"list",id:X.id||(X.source||Dn.source||"")+"_"+(Dn.songmid||X.title),title:X.title,artist:X.artist||Dn.singer||"",cover:X.cover||Dn.img||"",url:X.url||"",track:X.track||null,source:X.source||Dn.source||"",interval:X.interval||Dn.interval||""}});A(tn,j.name,Y)}}}}}),U.querySelectorAll("[data-list-remove]").forEach(function(k){k.onclick=function(F){F.stopPropagation();var Y=parseInt(k.getAttribute("data-list-remove"),10),j=Pn(kn);j&&(j.tracks.splice(Y,1),J(),z())}}),U.querySelectorAll("[data-src-filter]").forEach(function(k){k.onclick=function(){pe=k.getAttribute("data-src-filter"),z()}});var ot=U.querySelector("#muListSort");ot&&(ot.onclick=function(){var k=["default","title","artist","added"];if(In==="default")In="title",Wn=!0;else if(Wn)Wn=!1;else{var F=k.indexOf(In),Y=k[(F+1)%k.length];In=Y,Wn=!0}z(),N("排序："+{default:"默认",title:"按字母",artist:"按歌手",added:"按加入时间"}[In]+(In==="default"?"":Wn?" 正序":" 倒序"))});var st=U.querySelector("#muListImport");st&&(st.onclick=nr);var ct=U.querySelector("#muListNew");ct&&(ct.onclick=function(){re("新建歌单","歌单名称","",function(k){if(k){var F=he(k);F&&(kn=F.id,z())}})});var ut=U.querySelector("#muListRename");ut&&(ut.onclick=function(){var k=Pn(kn);k&&re("重命名歌单","歌单名称",k.name,function(F){!F||F===k.name||(k.name=F,J(),z(),N("已改名为「"+F+"」"))})});var lt=U.querySelector("#muListDel");lt&&(lt.onclick=function(){var k=Pn(kn);k&&$t("删除歌单","确定删除「"+k.name+"」？此操作不可撤销。",function(){vt(k.id),kn=An,z(),N("已删除")})})}var O=null;function Se(){if(!Z)return"";if(!bn)return'<div class="mu-imm-lyric-tip">歌词加载中…</div>';var n=bn.parsed||[];return n.length?'<span class="mu-lyr-pad"></span>'+n.map(function(e,t){return'<p class="mu-imm-lyric-line" data-line="'+t+'" data-time="'+e.time+'">'+a(e.text)+"</p>"}).join("")+'<span class="mu-lyr-pad"></span>':'<div class="mu-imm-lyric-tip">'+(bn.pending?"歌词加载中…（这首歌要跨平台找）":"暂无歌词")+"</div>"}function Ae(n){if(!n){bn=null,Xn="";return}var e=(n.source||"")+"|"+(n.id||n.title||"");if(e!==Xn&&(Xn=e,bn=null,!!window.LxLyric)){var t=setTimeout(function(){e!==Xn||bn||(bn={parsed:[],pending:!0},be())},8e3);window.LxLyric.getLyric(n).then(function(r){clearTimeout(t),e===Xn&&(bn=r,be())}).catch(function(){clearTimeout(t),e===Xn&&(bn={parsed:[]},be())})}}function be(){if(O){var n=O.querySelector("#muImmLyric");n&&(n.innerHTML=Se(),se(n),Rn=-1,ce(d?d.currentTime:0))}}function se(n){var e=n.querySelectorAll(".mu-lyr-pad");if(e.length)for(var t=Math.max(0,n.clientHeight/2-24),r=0;r<e.length;r++)e[r].style.height=t+"px"}var Rn=-1;function ce(n){if(!(!O||!bn)){var e=bn.parsed||[];if(e.length){for(var t=0,r=e.length-1,s=-1;t<=r;){var x=t+r>>1;e[x].time<=n?(s=x,t=x+1):r=x-1}if(s!==Rn){Rn=s;var _=O.querySelector("#muImmLyric");if(_){for(var S=_.querySelectorAll(".mu-imm-lyric-line"),M=0;M<S.length;M++)S[M].classList.toggle("active",M===s),S[M].classList.toggle("passed",M<s);var P=S[s];if(P){var H=P.offsetTop-_.clientHeight/2+P.offsetHeight/2;Vt(_,Math.max(0,H))}}}}}}var te=0;function Vt(n,e){te&&(clearTimeout(te),te=0);var t=n.scrollTop,r=e-t;if(!(Math.abs(r)<1)){var s=Math.min(520,260+Math.abs(r)*.35),x=performance.now(),_=function(P){return P<.5?4*P*P*P:1-Math.pow(-2*P+2,3)/2},S=!1,M=function(){if(!S){var P=performance.now(),H=Math.min(1,(P-x)/s);n.scrollTop=t+r*_(H),H<1?te=setTimeout(M,16):(S=!0,te=0)}};te=setTimeout(M,16)}}function Ye(){ue();try{var n=localStorage.getItem("juice_music_show_lyric");n!==null&&(Z=n==="1")}catch{}O=document.createElement("div"),O.className="mu-immersive",O.innerHTML=Zt(),document.body.appendChild(O),u(O),Xt(),Ln(d&&!d.paused),V(),Rn=-1,Ae(i);var e=O.querySelector("#muImmLyric");e&&se(e),setTimeout(function(){if(O){var t=O.querySelector("#muImmLyric");t&&se(t),Rn=-1,ce(d?d.currentTime:0)}},60)}function Zt(){for(var n=d&&i&&!d.paused,e="",t=0;t<24;t++)e+='<i style="--d:'+(t*.08).toFixed(2)+'s"></i>';return'<div class="mu-imm-bg"></div><div class="mu-imm-inner"><div class="mu-imm-left"><div class="mu-imm-deck"><div class="mu-imm-vinyl'+(n&&!(i&&i.cover)?" spin":"")+'"><span class="mu-imm-grooves"></span><div class="mu-imm-disc'+(n&&i&&i.cover?" spin":"")+'">'+(i&&i.cover?'<img src="'+a(i.cover)+'" alt="">':o("Play"))+'</div><span class="mu-imm-hole"></span></div></div><div class="mu-imm-bars'+(n?" on":"")+'">'+e+'</div><div class="mu-imm-title">'+(i?a(i.title):"未在播放")+'</div><div class="mu-imm-artist">'+(i&&i.artist?a(i.artist):"我的音乐台")+'</div></div><div class="mu-imm-lyric'+(Z?"":" hidden")+'" id="muImmLyric">'+Se()+'</div><div class="mu-imm-foot"><div class="mu-bar imm"><span class="mu-time mu-time-cur">0:00</span><div class="mu-bar-progress"><i></i></div><input type="range" class="mu-seek" min="0" step="0.1" value="0"><span class="mu-time mu-time-dur">0:00</span></div><div class="mu-ops imm"><div class="mu-imm-ops-left"><button class="mu-op lyric-btn'+(Z?" on":"")+'" data-imm="lyric" title="'+(Z?"隐藏歌词":"显示歌词")+'"><span class="mu-lyric-glyph'+(Z?"":" off")+'">词</span></button><button class="mu-op" data-imm="queue" title="播放列表">'+o("ListMusic")+'</button><button class="mu-op'+(i&&Bn(An,{track:i.track||i})?" on":"")+'" data-imm="love" title="收藏">'+o("Heart")+'</button></div><div class="mu-imm-ops-center"><button class="mu-op" data-imm="prev" title="上一首">'+o("SkipBack")+'</button><button class="mu-op big" data-imm="toggle" title="播放/暂停" data-morph="'+(n?"Pause":"Play")+'">'+o(n?"Pause":"Play")+'</button><button class="mu-op" data-imm="next" title="下一首">'+o("SkipForward")+'</button></div><div class="mu-imm-ops-right"><button class="mu-op'+(ee()!=="all"?" on":"")+'" data-imm="mode" title="'+{one:"单曲循环",all:"顺序播放",shuffle:"随机播放"}[ee()]+'">'+o({one:"Repeat1",all:"Repeat",shuffle:"Shuffle"}[ee()])+'</button><span class="mu-imm-vol"><button class="mu-op" data-imm="mute" title="'+(p.volume<=0?"取消静音":"静音")+'">'+o(p.volume<=0?"VolumeX":"Volume2")+'</button><span class="mu-imm-vol-pop"><span class="mu-imm-vol-num" id="muImmVolNum">'+Math.round(p.volume*100)+'</span><input type="range" class="mu-imm-vol-range" min="0" max="1" step="0.01" value="'+p.volume+'" orient="vertical" aria-label="音量"></span></span><button class="mu-op" data-imm="exit" title="退出全屏（Esc）">'+o("Minimize2")+"</button></div></div></div></div>"}function Xt(){O.querySelector('[data-imm="prev"]').onclick=ln,O.querySelector('[data-imm="next"]').onclick=function(){nn(!1)},O.querySelector('[data-imm="toggle"]').onclick=W,O.querySelector('[data-imm="exit"]').onclick=ue;var n=O.querySelector(".mu-imm-vol-range");n&&(n.oninput=function(){Tn(parseFloat(n.value)),ye()}),je(O.querySelector(".mu-imm-vol"));var e=O.querySelector('[data-imm="mute"]');e&&(e.onclick=function(){p.volume>0?($n=p.volume,Tn(0)):Tn($n>0?$n:.7),ye()});var t=O.querySelector('[data-imm="love"]');t&&(t.onclick=function(){if(i){var _={id:i.id,title:i.title,artist:i.artist,cover:i.cover||"",source:i.source||"",interval:i.interval||"",track:i.track||null},S=_e(_);t.classList.toggle("on",S),t.querySelector("svg")?.classList.toggle("on",S),N(S?"已收藏":"已取消收藏")}});var r=O.querySelector('[data-imm="queue"]');r&&(r.onclick=function(){ze(!0)});var s=O.querySelector('[data-imm="mode"]');s&&(s.onclick=function(){Ge();var _=ee(),S=O.querySelector('[data-imm="mode"]');S&&(S.innerHTML=o({one:"Repeat1",all:"Repeat",shuffle:"Shuffle"}[_]),u(S),S.classList.toggle("on",_!=="all"),S.title={one:"单曲循环",all:"顺序播放",shuffle:"随机播放"}[_])}),O.querySelector('[data-imm="lyric"]').onclick=function(){Z=!Z;try{localStorage.setItem("juice_music_show_lyric",Z?"1":"0")}catch{}var _=O.querySelector("#muImmLyric");_&&_.classList.toggle("hidden",!Z),this.classList.toggle("on",Z),this.title=Z?"隐藏歌词":"显示歌词";var S=this.querySelector(".mu-lyric-glyph");S&&S.classList.toggle("off",!Z),Z&&(_.innerHTML=Se(),se(_),Rn=-1,ce(d?d.currentTime:0))};var x=O.querySelector(".mu-seek");x.oninput=function(){d&&d.duration&&(d.currentTime=parseFloat(x.value))},O.addEventListener("click",function(_){(_.target===O||_.target.classList.contains("mu-imm-bg"))&&ue()})}function ue(){O&&(O.remove(),O=null,Un())}var wn=null;function Ve(){wn||(wn=document.createElement("div"),wn.className="mu-mini",wn.style.display="none",document.body.appendChild(wn))}function Nn(){if(Ve(),!i){wn.style.display="none";return}var n=U&&document.getElementById("mod-music").classList.contains("active"),e=!(n||O);if(wn.style.display=e?"flex":"none",!!e){var t=d&&!d.paused;wn.innerHTML='<span class="mu-mini-dot'+(t?" on":"")+'"></span><span class="mu-mini-title">'+a(i.title)+'</span><button class="mu-mini-btn" data-mini="toggle" title="播放/暂停">'+o(t?"Pause":"Play")+'</button><button class="mu-mini-btn" data-mini="next" title="下一首">'+o("SkipForward")+'</button><button class="mu-mini-btn" data-mini="goto" title="打开播放器">'+o("Maximize2")+'</button><button class="mu-mini-btn" data-mini="stop" title="停止">'+o("X")+"</button>",u(wn),wn.querySelectorAll("[data-mini]").forEach(function(r){r.onclick=function(s){s.stopPropagation();var x=r.getAttribute("data-mini");if(x==="toggle")W();else if(x==="next")nn(!1);else if(x==="goto")window.AppRouter&&window.AppRouter.navigate("music","home");else if(x==="stop"){try{d.pause(),d.removeAttribute("src"),d.load()}catch{}i=null,h=[],w=-1,f(),wn.style.display="none",yn()}}}),wn.onclick=function(){window.AppRouter&&window.AppRouter.navigate("music","home")}}}function Ln(n){var e=document.getElementById("muPlayerBar");Gt(!!n);var t=e&&e.querySelector("#muDisc");t&&t.classList.toggle("spin",!!n);var r=document.querySelectorAll(".mu-imm-title");r.forEach(function(P){i&&(P.textContent=i.title)});var s=document.querySelectorAll(".mu-imm-artist");if(s.forEach(function(P){i&&(P.textContent=i.artist||"我的音乐台")}),O){var x=O.querySelector(".mu-imm-vinyl"),_=O.querySelector(".mu-imm-disc"),S=O.querySelector(".mu-imm-bars"),M=!!(i&&i.cover);x&&x.classList.toggle("spin",!!n&&!M),_&&_.classList.toggle("spin",!!n&&M),S&&S.classList.toggle("on",!!n)}if(Nn(),"mediaSession"in navigator)try{navigator.mediaSession.playbackState=n?"playing":"paused"}catch{}}var Ze=null;function N(n){var e=document.querySelector(".mu-toast");e||(e=document.createElement("div"),e.className="mu-toast",document.body.appendChild(e)),e.textContent=n,e.classList.add("show"),clearTimeout(Ze),Ze=setTimeout(function(){e.classList.remove("show")},2200)}var cn=null;function re(n,e,t,r,s){Jn(),s=s||{},cn=document.createElement("div"),cn.className="mu-modal-mask",cn.innerHTML='<div class="mu-modal-box mu-ask-box"><h4 class="mu-modal-title">'+a(n)+"</h4>"+(s.hint?'<p class="mu-ask-hint">'+a(s.hint)+"</p>":"")+(s.multiline?'<textarea class="mu-textarea mu-ask-input" id="muAskInput" rows="6" placeholder="'+a(e)+'">'+a(t||"")+"</textarea>":'<input class="mu-input mu-ask-input" id="muAskInput" placeholder="'+a(e)+'" value="'+a(t||"")+'" maxlength="30">')+'<div class="mu-modal-ops"><button class="mu-btn" id="muAskCancel">取消</button><button class="mu-btn primary" id="muAskOk">确定</button></div></div>',document.body.appendChild(cn);var x=cn.querySelector("#muAskInput"),_=function(){var S=x.value.trim();Jn(),r(S)};cn.querySelector("#muAskOk").onclick=_,cn.querySelector("#muAskCancel").onclick=Jn,cn.onclick=function(S){S.target===cn&&Jn()},x.onkeydown=function(S){if(S.key==="Escape"){S.preventDefault(),Jn();return}S.key==="Enter"&&(!s.multiline||S.ctrlKey||S.metaKey)&&(S.preventDefault(),_())},setTimeout(function(){x.focus(),s.multiline||x.select()},30)}function Jn(){cn&&(cn.remove(),cn=null)}function $t(n,e,t){Jn(),cn=document.createElement("div"),cn.className="mu-modal-mask",cn.innerHTML='<div class="mu-modal-box mu-ask-box"><h4 class="mu-modal-title">'+a(n)+'</h4><p class="mu-ask-hint">'+a(e)+'</p><div class="mu-modal-ops"><button class="mu-btn" id="muAskCancel">取消</button><button class="mu-btn danger" id="muAskOk">确定</button></div></div>',document.body.appendChild(cn),cn.querySelector("#muAskOk").onclick=function(){Jn(),t()},cn.querySelector("#muAskCancel").onclick=Jn,cn.onclick=function(r){r.target===cn&&Jn()}}function nr(){re("导入歌单","粘贴歌单分享链接，或一行一首「歌名 - 歌手」","",function(n){if(n){var e=er(n);if(e){N("正在读取「"+e.platform+"」歌单…"),tr(e).then(function(s){if(!s||!s.tracks.length){N("歌单读取失败："+(s&&s.error||"没有取到歌曲"));return}var x=s.name||"导入 "+new Date().toLocaleDateString("zh-CN");re("命名歌单","歌单名称",x,function(_){var S=he(_||x);S&&sr(s.tracks,S)})});return}var t=cr(n);if(!t.length){N("没识别到歌单链接或歌曲，试试粘贴分享链接");return}var r="导入 "+new Date().toLocaleDateString("zh-CN");re("命名歌单","歌单名称",r,function(s){var x=he(s||r);x&&ur(t,x)})}},{multiline:!0,hint:"支持网易云 / QQ音乐 / 酷狗 / 酷我 的歌单分享链接；也可以一行一首「歌名 - 歌手」"})}function er(n){var e=String(n||""),t=e.match(/music\.163\.com\/(?:[a-z]+\/)?(?:playlist|discover)?[^\s]*?[?&#]id=(\d+)/i)||e.match(/music\.163\.com\/(?:m\/)?playlist\/(\d+)/i);if(t)return{platform:"网易云音乐",kind:"wy",id:t[1]};var r=e.match(/(?:[a-z0-9]+\.)?y\.qq\.com\/n\/ryqq\/playlist\/(\d+)/i)||e.match(/(?:[a-z0-9]+\.)?y\.qq\.com\/[^\s]*?playlist[^\s]*?[?&]id=(\d+)/i)||e.match(/(?:[a-z0-9]+\.)?y\.qq\.com\/[^\s]*?[?&]disstid=(\d+)/i)||e.match(/(?:[a-z0-9]+\.)?y\.qq\.com\/[^\s]*?[?&]id=(\d+)/i);if(r)return{platform:"QQ音乐",kind:"tx",id:r[1]};var s=e.match(/kugou\.com\/yy\/special\/single\/(\d+)/i)||e.match(/kugou\.com\/plist\/list\/(\d+)/i)||e.match(/kugou\.com\/[^\s]*?specialid=(\d+)/i);if(s)return{platform:"酷狗音乐",kind:"kg",id:s[1]};var x=e.match(/kuwo\.cn\/playlist_detail\/(\d+)/i)||e.match(/kuwo\.cn\/[^\s]*?playlistId=(\d+)/i);return x?{platform:"酷我音乐",kind:"kw",id:x[1]}:null}function tr(n){return n.kind==="wy"?ir(n.id):n.kind==="tx"?rr(n.id):Promise.resolve({name:"",tracks:[],error:n.platform+" 歌单暂未支持，请改用文本导入"})}function rr(n){var e={req_1:{module:"music.srfDissInfo.aiDissInfo",method:"uniform_get_Dissinfo",param:{disstid:Number(n),enc_host_uin:"",tag:1,userinfo:1,is_pc:1}},comm:{ct:24,cv:0}},t="https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&data="+encodeURIComponent(JSON.stringify(e));return window.LxRequest.httpFetch(t,{timeout:15e3}).promise.then(function(r){var s=r&&r.body&&r.body.req_1&&r.body.req_1.data;if(!s)return{name:"",tracks:[],error:"歌单不存在或已设为私密"};var x=(s.songlist||[]).map(ar).filter(function(S){return S.title}),_=s.dirinfo||{};return{name:_.title||s.dissname||"",cover:_.picurl||"",tracks:x,error:x.length?"":"歌单里没有歌曲"}}).catch(function(r){return{name:"",tracks:[],error:r&&r.message||"网络错误"}})}function ar(n){var e=n.singer||[],t=n.album||{},r=t.picurl||t.picUrl||(t.mid?"https://y.gtimg.cn/music/photo_new/T002R300x300M000"+t.mid+".jpg":"");return{title:String(n.name||n.title||"").trim(),artist:e.map(function(s){return s.name}).filter(Boolean).join("、"),cover:r,interval:n.interval?g(n.interval):""}}function ir(n){var e="https://music.163.com/api/v6/playlist/detail?id="+encodeURIComponent(n);return window.LxRequest.httpFetch(e,{timeout:1e4,headers:{Referer:"https://music.163.com/"}}).promise.then(function(t){var r=t&&t.body&&t.body.playlist;if(!r)return{name:"",tracks:[],error:"歌单不存在或已设为私密"};var s=(r.trackIds||[]).map(function(_){return _.id}),x=(r.tracks||[]).map(function(_){return Xe(_)});return s.length?or(s).then(function(_){return{name:r.name,cover:r.coverImgUrl||"",tracks:_.length?_:x}}):{name:r.name,tracks:x}}).catch(function(t){return{name:"",tracks:[],error:t&&t.message||"网络错误"}})}function or(n){for(var e=200,t=[],r=0;r<n.length;r+=e)t.push(n.slice(r,r+e));return Promise.all(t.map(function(s){var x="ids="+encodeURIComponent(JSON.stringify(s))+"&c="+encodeURIComponent(JSON.stringify(s.map(function(_){return{id:_}})));return window.LxRequest.httpFetch("https://music.163.com/api/song/detail",{method:"post",body:x,timeout:15e3,headers:{"Content-Type":"application/x-www-form-urlencoded",Referer:"https://music.163.com/"}}).promise.then(function(_){var S=_&&_.body&&_.body.songs||[];return S.map(Xe).filter(function(M){return M.title})}).catch(function(){return[]})})).then(function(s){var x={};return s.forEach(function(_){_.forEach(function(S){S.wyId&&(x[S.wyId]=S)})}),n.map(function(_){return x[_]}).filter(Boolean)})}function Xe(n){var e=n.ar||n.artists||[],t=n.al||n.album||{};return{title:String(n.name||"").trim(),artist:e.map(function(r){return r.name}).filter(Boolean).join("、"),cover:t.picUrl||"",wyId:n.id,interval:n.dt?g(n.dt/1e3):n.duration?g(n.duration/1e3):""}}function sr(n,e){var t=n.length;if(!t)return N("歌单里没有歌曲"),Promise.resolve();kn=e.id,gn={listId:e.id,done:0,total:t,added:0,failed:0,running:!0},z();var r=4,s=0;function x(){if(s>=t)return Promise.resolve();var M=n[s++];return window.LxMusic.search((M.title+" "+M.artist).trim(),1).then(function(P){var H=$e(P.list||[],{title:M.title,artist:M.artist});H?Bn(e.id,H)||(ie(e.id,{id:H.source+"_"+H.songmid,title:H.name,artist:H.singer,cover:H.img||M.cover||"",source:H.source,interval:H.interval,track:H}),gn.added++):gn.failed++}).catch(function(){gn.failed++}).then(function(){return gn.done++,B==="lists"&&kn===e.id&&z(),x()})}for(var _=[],S=0;S<r;S++)_.push(x());return Promise.all(_).then(function(){var M=e.tracks.length,P=gn?gn.failed:0;gn=null,z(),N("导入完成：成功 "+M+" 首"+(P?"，未匹配 "+P+" 首":""))})}function cr(n){var e=[],t={};return String(n).split(/\r?\n/).forEach(function(r){var s=r.trim();if(s&&(s=s.replace(/^[\s·•\-—*>#\d.、]+/,"").replace(/[《》「」“”"]/g,"").replace(/\s*(分享|来自|复制链接|打开\S*APP|https?:\/\/\S+)\s*/g," ").trim(),!(!s||s.length>80))){var x="",_="",S=s.match(/^(.+?)\s*[-–—]\s*(.+)$/);if(S)x=S[1].trim(),_=S[2].trim();else{var M=s.match(/^(.+?)\s*[·|]\s*(.+)$/);M?(x=M[2].trim(),_=M[1].trim()):x=s}if(x=x.replace(/\s+/g," ").trim(),_=_.replace(/\s+/g," ").trim(),!(!x||x.length<1)){var P=(x+"|"+_).toLowerCase();t[P]||(t[P]=1,e.push({title:x,artist:_}))}}}),e.slice(0,100)}function ur(n,e){if(!window.LxMusic){N("音源未就绪");return}var t=0,r=0,s=0;N("开始导入 "+n.length+" 首…");var x=Promise.resolve();n.forEach(function(_,S){x=x.then(function(){var M=(_.title+" "+_.artist).trim();return window.LxMusic.search(M,1).then(function(P){var H=$e(P.list||[],_);H&&!Bn(e.id,H)?(ie(e.id,{id:H.source+"_"+H.songmid,title:H.name,artist:H.singer,cover:H.img||"",source:H.source,interval:H.interval,track:H}),r++):H||s++}).catch(function(){s++}).then(function(){t++,(t%5===0||t===n.length)&&N("导入中 "+t+"/"+n.length+"（成功 "+r+"）")})})}),x.then(function(){kn=e.id,z(),N("导入完成：成功 "+r+" 首"+(s?"，失败 "+s+" 首":""))})}function $e(n,e){if(!n.length)return null;for(var t=e.title.toLowerCase(),r=e.artist.toLowerCase(),s=null,x=null,_=0;_<n.length;_++){var S=n[_],M=String(S.name||"").toLowerCase(),P=String(S.singer||"").toLowerCase(),H=M===t,mn=!r||P.indexOf(r)>-1;if(H&&mn){s=S;break}!x&&H&&(x=S)}return s||x||null}function lr(n){var e=document.getElementById("mod-music").classList.contains("active"),t=!!O,r=!!document.getElementById("muAddListMask");if(!(!e&&!t&&!r)&&!/INPUT|TEXTAREA/.test(n.target&&n.target.tagName||"")){if(n.key==="Escape"&&r){_n=-1,pn=null,document.getElementById("muAddListMask").remove();return}!e&&!t||(n.code==="Space"?(n.preventDefault(),W()):n.key==="ArrowRight"&&d?d.currentTime=Math.min(d.duration||0,d.currentTime+5):n.key==="ArrowLeft"&&d?d.currentTime=Math.max(0,d.currentTime-5):n.key==="ArrowUp"?(n.preventDefault(),Tn(p.volume+.05)):n.key==="ArrowDown"?(n.preventDefault(),Tn(p.volume-.05)):n.key==="Escape"&&t&&ue())}}var nt=!1,le=!1,un=null;function dr(){if(!nt){nt=!0;var n=l();if(n){le=!0;try{xr(n)}finally{setTimeout(function(){le=!1},1200)}}}}function xr(n){var e=[];if(h=n.queue.map(function(x,_){return x.kind==="local"&&/^blob:/.test(x.url||"")?null:(e.push(_),x)}).filter(Boolean),!h.length){et();return}E=n.name||"";var t=e.indexOf(n.qi);if(w=t>=0?t:typeof n.qi=="number"&&n.qi>=0&&n.qi<h.length?n.qi:0,i=h[w],!i){et();return}h.forEach(function(x){x.kind!=="link"&&(x.url="")});var r=Math.max(0,Number(n.pos)||0);v=r,an=Math.floor(r),r>0&&(un={id:i.id,pos:r});var s=n.at&&Date.now()-n.at>6*3600*1e3;s&&(un=null),ke(),Ln(!1),Fn(),Un(),yn(),Nn(),Ae(i),K(i)}function et(){try{localStorage.removeItem(I)}catch{}}function fr(){if(U=document.getElementById("muRoot"),!!U){if(Q(),!G){G=!0,document.addEventListener("keydown",lr),window.addEventListener("hashchange",function(){_n=-1,pn=null;var s=document.getElementById("muAddListMask");s&&s.remove(),setTimeout(Un,60),setTimeout(Un,400)});var n=function(){d&&!d.paused&&isFinite(d.currentTime)&&d.currentTime>0&&(v=Math.floor(d.currentTime)),f()};window.addEventListener("pagehide",n),document.addEventListener("visibilitychange",function(){document.visibilityState==="hidden"&&n()});var e=document.getElementById("mod-music");if(e&&window.MutationObserver&&new MutationObserver(Un).observe(e,{attributes:!0,attributeFilter:["class"]}),document.addEventListener("click",function(s){var x=document.getElementById("muSuggest");if(!(!x||x.hidden)){var _=document.getElementById("muSearchKw");x.contains(s.target)||_&&_.contains(s.target)||(x.hidden=!0)}}),y(),Ve(),dr(),window.LxMusic){oe=!0;var t=!1,r=setInterval(function(){Ce();var s=window.LxMusic.listLoaded().length;s>0&&(oe=!1),s>0&&!t&&(t=!0,B==="search"&&z())},800);window.LxMusic.loadBuiltinScripts().then(function(){return window.LxMusic.loadSavedScripts()}).then(function(){clearInterval(r),oe=!1,Ce(),(B==="script"||B==="search")&&z(),Nn()}).catch(function(s){clearInterval(r),oe=!1,Ce(),console.warn("[LxMusic] 音源加载失败",s)})}}z(),tt()}}function tt(){un&&V()}function mr(){z(),tt()}function hr(){ue(),Jn(),_n=-1,pn=null;var n=document.getElementById("muAddListMask");n&&n.remove(),Nn()}window.AppMusic={init:fr,restoreView:mr,destroy:hr}})();

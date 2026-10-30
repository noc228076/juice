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
const _0x3a325a=_0x3a9f,_0x217cc4=_0x3a9f,_0x35a8b7=_0x3a9f,_0xaa95a0=_0x3a9f,_0x18f6b8=_0x120c,_0x2ee0ad=_0x120c,_0x13a569=_0x120c,_0x16c72a=_0x120c;(function(_0x23d796,_0xab35d3){const _0x29087f={_0x1621bf:0x2f0,_0x4c764e:'qT0F',_0x65ff2:0x2f6,_0x318e08:'5f%^',_0x20a417:'0x1b0',_0x14d0db:0x254,_0x265cb6:'0x259',_0x576408:'0x237',_0x274aa8:0x216,_0x3689a2:'0x2db',_0x1f3a38:0x30e,_0x4f1c3f:'!4rw',_0x5ecd6b:0x205,_0x32aa23:'EC3C',_0x47cfc3:'0x223',_0x5f4963:'0x2e9'},_0x3f6501=_0x120c,_0x2a93e9=_0x120c,_0x4743a2=_0x120c,_0x369a58=_0x120c,_0xe63c46=_0x3a9f,_0x454027=_0x3a9f,_0x51dc9c=_0x3a9f,_0x3f8453=_0x3a9f,_0x21fbaf=_0x23d796();while(!![]){try{const _0xef34d8=-parseInt(_0xe63c46(_0x29087f._0x1621bf,_0x29087f._0x4c764e))/(-0x3*-0x3ad+0x2e+-0x1*0xb34)+parseInt(_0x454027(_0x29087f._0x65ff2,_0x29087f._0x318e08))/(-0xbda*-0x2+-0x1745+0x6d*-0x1)*(-parseInt(_0x3f6501(_0x29087f._0x20a417))/(-0xb+0xca3+-0x1*0xc95))+parseInt(_0x2a93e9(_0x29087f._0x14d0db))/(-0xbec+-0x11*-0x22e+-0x191e)*(parseInt(_0x4743a2(_0x29087f._0x265cb6))/(0x810+0x23cd+-0x2bd8))+parseInt(_0xe63c46(_0x29087f._0x576408,_0x29087f._0x4c764e))/(0x116+-0x15f4+0x14e4)*(parseInt(_0x4743a2(_0x29087f._0x274aa8))/(-0x6c*0x3+-0x24c9+0x2614))+parseInt(_0x369a58(_0x29087f._0x3689a2))/(-0xbb+0x1843*-0x1+0x1906)*(-parseInt(_0x454027(_0x29087f._0x1f3a38,_0x29087f._0x4f1c3f))/(-0x3*-0xbc7+-0x1db1+-0x59b))+-parseInt(_0x454027(_0x29087f._0x5ecd6b,_0x29087f._0x32aa23))/(0x33b*0x9+-0x28*0x87+-0x7f1)*(parseInt(_0x3f6501(_0x29087f._0x47cfc3))/(0x397*0x8+0x38*-0x93+0x37b))+parseInt(_0x4743a2(_0x29087f._0x5f4963))/(0x5b4+-0xb2f+-0x587*-0x1);if(_0xef34d8===_0xab35d3)break;else _0x21fbaf['push'](_0x21fbaf['shift']());}catch(_0x34c5e6){_0x21fbaf['push'](_0x21fbaf['shift']());}}}(_0x4c3c,0x16b203*-0x1+-0x8*0x38714+-0x957a3*-0x7));const {EVENT_NAMES,request,on,send}=globalThis['lx'],_0x5472cf={};_0x5472cf[_0x18f6b8('0x1f4')]=_0x2ee0ad('0x1c4')+_0x3a325a('0x211','@u#$')+_0x2ee0ad('0x222')+_0x2ee0ad(0x1b8)+_0x13a569(0x25d)+_0x217cc4('0x290','pnlU')+_0x13a569(0x232)+_0x35a8b7(0x285,'tfNn')+_0x13a569(0x21e)+_0x13a569('0x2e8')+_0x2ee0ad('0x267')+_0x217cc4('0x1cd','A@mh')+_0xaa95a0('0x1fe','pnlU'),_0x5472cf[_0x16c72a('0x303')+_0x18f6b8(0x27c)+_0x2ee0ad('0x2e5')]=_0x217cc4(0x288,'@u#$')+_0x2ee0ad(0x2c3)+_0x217cc4('0x2a1','6K^#')+_0x18f6b8(0x219)+_0x16c72a('0x2ee')+_0x3a325a(0x249,'TDt$')+_0x16c72a(0x1fb)+_0x217cc4('0x28b','#2r5')+_0xaa95a0(0x2dc,'9RqC')+_0x35a8b7(0x1ac,'[&6r')+_0xaa95a0(0x247,'ad8w')+_0x13a569(0x2d4);const URL_CONFIG=_0x5472cf,SCRIPT_VERSION=_0xaa95a0('0x1d7','@%^s')+'.0',_0x173475={};_0x173475[_0x2ee0ad('0x2de')]=_0x3a325a('0x289','K@Lq')+_0x35a8b7(0x25f,']%FK'),_0x173475[_0x35a8b7('0x22e','WUme')]=_0x13a569('0x1ed')+'gh',_0x173475[_0x35a8b7(0x1e0,'&oc*')]=_0x16c72a('0x234')+_0x217cc4(0x263,'oXG2'),_0x173475[_0xaa95a0(0x1f5,'qT0F')+_0xaa95a0('0x1de','Y)g4')+'t']=_0x35a8b7(0x1b5,'GPTk')+'s',_0x173475[_0x2ee0ad('0x2d0')+'s']=_0x35a8b7('0x24c','%RgA')+'s',_0x173475[_0xaa95a0('0x207','ewLf')+'er']=_0xaa95a0(0x214,'ao%)')+'r';const _0x4787ed={};_0x4787ed[_0x13a569('0x2de')]=_0x35a8b7('0x1d4','6K^#')+_0x217cc4(0x1ab,'ao%)'),_0x4787ed[_0x3a325a(0x248,'XR$D')]=_0x18f6b8(0x1ed)+'gh',_0x4787ed[_0x2ee0ad(0x2b8)]=_0x3a325a(0x2b6,'4gsh')+_0x217cc4('0x204','9A!V');const _0x24c67f={};_0x24c67f[_0x2ee0ad(0x2de)]=_0x3a325a(0x243,'tfNn')+_0x2ee0ad(0x2ad),_0x24c67f[_0x13a569('0x21a')]=_0x2ee0ad('0x1ed')+'gh',_0x24c67f[_0xaa95a0(0x1c6,'H(5t')]=_0x3a325a(0x299,'oXG2')+_0xaa95a0('0x22c','EC3C'),_0x24c67f[_0x13a569('0x2b8')+_0x13a569('0x1e8')+'t']=_0x35a8b7('0x20f','4gsh')+'s',_0x24c67f[_0x13a569('0x30f')+'s']=_0x16c72a('0x30f')+'s',_0x24c67f[_0x16c72a('0x2d6')+'er']=_0x16c72a(0x27d)+_0x18f6b8('0x2ce'),_0x24c67f[_0x217cc4(0x2e2,'$i5n')+'s']=_0x217cc4('0x26f','A@mh')+_0x2ee0ad('0x2a5');const _0x189c28={};_0x189c28[_0x16c72a(0x2de)]=_0x3a325a('0x281','fjOz')+_0x35a8b7('0x2c0','tfNn'),_0x189c28[_0x217cc4('0x1e5',']%FK')]=_0xaa95a0('0x2c5','!4rw')+'gh',_0x189c28[_0x18f6b8('0x2b8')]=_0x13a569(0x234)+_0x3a325a(0x25c,'x%sI');const _0x343155={};_0x343155['kg']=_0x173475,_0x343155['tx']=_0x4787ed,_0x343155['wy']=_0x24c67f,_0x343155['kw']=_0x189c28;const QUALITY_MAP=_0x343155,_0x3a9c53={};function _0x120c(_0x2e23fe,_0x221541){_0x2e23fe=_0x2e23fe-(0x2*-0xdb+0x964+-0x608);const _0xf60cc=_0x4c3c();let _0x2967c9=_0xf60cc[_0x2e23fe];if(_0x120c['BsuItT']===undefined){var _0x1ab76f=function(_0x2d9b90){const _0xa4111d='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';let _0x1826e6='',_0x203c01='';for(let _0x120a26=-0x1b1c+-0x38f+0x1eab,_0x2e8d54,_0x1fd6a5,_0x11652d=-0x1*-0x1fb8+-0xe*-0x20c+-0x78c*0x8;_0x1fd6a5=_0x2d9b90['charAt'](_0x11652d++);~_0x1fd6a5&&(_0x2e8d54=_0x120a26%(0xc2+-0x1327*0x1+0x1269)?_0x2e8d54*(0x22e5*0x1+-0x21ce*-0x1+0x1b*-0x289)+_0x1fd6a5:_0x1fd6a5,_0x120a26++%(-0xabb+-0x161*0x18+-0x3*-0xe9d))?_0x1826e6+=String['fromCharCode'](-0x150b*0x1+-0x449*0x3+-0x1*-0x22e5&_0x2e8d54>>(-(0x2254+-0x1*-0x255+-0xb*0x355)*_0x120a26&0x1*-0x122d+0xcaa+0x589)):-0x9*-0x43+0x316*-0x4+0x9fd){_0x1fd6a5=_0xa4111d['indexOf'](_0x1fd6a5);}for(let _0x792c80=0x223*-0x8+-0x19ca*0x1+0x3e6*0xb,_0x3864ff=_0x1826e6['length'];_0x792c80<_0x3864ff;_0x792c80++){_0x203c01+='%'+('00'+_0x1826e6['charCodeAt'](_0x792c80)['toString'](-0x7c1+0x12d6+-0xb05))['slice'](-(-0xe9e+-0x11ee+0x208e));}return decodeURIComponent(_0x203c01);};_0x120c['EOEXLI']=_0x1ab76f,_0x120c['DPjRIh']={},_0x120c['BsuItT']=!![];}const _0x473a52=_0xf60cc[0x730+-0x5*0x71f+-0x1c6b*-0x1],_0x2aa9fc=_0x2e23fe+_0x473a52,_0xdf266f=_0x120c['DPjRIh'][_0x2aa9fc];return!_0xdf266f?(_0x2967c9=_0x120c['EOEXLI'](_0x2967c9),_0x120c['DPjRIh'][_0x2aa9fc]=_0x2967c9):_0x2967c9=_0xdf266f,_0x2967c9;}_0x3a9c53['kg']=[_0x13a569(0x1af)+'r',_0xaa95a0(0x2c7,'ewLf')+'s',_0x16c72a(0x30f)+'s',_0xaa95a0('0x25b','F$*O')+_0x35a8b7('0x23c','!4rw'),_0x16c72a('0x1ed')+'gh',_0x13a569(0x1c2)+_0x35a8b7(0x305,'!4rw')],_0x3a9c53['tx']=[_0x3a325a(0x20c,'WUme')+_0x2ee0ad(0x26b),_0x35a8b7('0x27b','GPTk')+'gh',_0x13a569('0x1c2')+_0x18f6b8('0x2ad')],_0x3a9c53['wy']=[_0x217cc4(0x1ef,']NX#')+_0x13a569(0x2ce),_0x18f6b8(0x2f1)+_0x18f6b8('0x2a5'),_0x35a8b7(0x20a,'XR$D')+'s',_0x13a569(0x234)+_0x16c72a(0x26b),_0x2ee0ad(0x1ed)+'gh',_0x13a569(0x1c2)+_0x13a569(0x2ad)],_0x3a9c53['kw']=[_0x13a569(0x234)+_0x3a325a('0x225','tfNn'),_0x35a8b7('0x28d','@%^s')+'gh',_0x2ee0ad(0x1c2)+_0x35a8b7('0x1d2',']z%5')];const PLATFORM_ALLOW_LEVEL=_0x3a9c53,_0x1a862b={};_0x1a862b['kg']=[_0x2ee0ad(0x2de),_0x13a569('0x21a'),_0x217cc4('0x1cc','fjOz'),_0x35a8b7('0x1b1','ckwF')+_0x18f6b8(0x1e8)+'t',_0x3a325a(0x268,'EC3C')+'s',_0x3a325a('0x2be','YUFQ')+'er'],_0x1a862b['tx']=[_0x18f6b8(0x2de),_0x18f6b8(0x21a),_0x13a569('0x2b8')],_0x1a862b['wy']=[_0xaa95a0(0x2bc,'4gsh'),_0x13a569(0x21a),_0x3a325a('0x1f5','qT0F'),_0x13a569(0x2b8)+_0x3a325a(0x29d,'WUme')+'t',_0x3a325a('0x24a','pnlU')+'s',_0x3a325a('0x25e','GPTk')+'er',_0x2ee0ad(0x2d0)+'s'],_0x1a862b['kw']=[_0x2ee0ad(0x2de),_0x2ee0ad('0x21a'),_0x16c72a('0x2b8')];const SOURCE_QUALITY_LIST=_0x1a862b,_0x1b391f={};_0x1b391f['kg']=_0x35a8b7(0x1f0,'ao(D'),_0x1b391f['tx']=_0x18f6b8('0x258'),_0x1b391f['wy']=_0x2ee0ad(0x2e6),_0x1b391f['kw']=_0x2ee0ad(0x233);const PLATFORM_NAME=_0x1b391f,httpFetch=(_0x45d153,_0x4e8a2c={})=>new Promise((_0x3d9aa8,_0x4f9b3b)=>{const _0x4bba99={_0x4f82a0:0x1a7,_0x7bcb78:'4gsh',_0x106242:'0x2e3'},_0x329566={_0xf1abb8:0x270,_0x1b7050:'0x238',_0x4c20e0:'0x2a2',_0x2800d9:0x2a8,_0x2937cc:'%RgA',_0x91bb0:0x242,_0x33d2d9:'0x311',_0x2abbad:0x220,_0x19b984:'z58f',_0x5270e4:'0x1aa',_0x17fa8e:0x1fa,_0x1def88:'0x2cc',_0x2ac256:'VbBm',_0xae52e6:0x1fa,_0x87fbb9:'0x1ad',_0x12aac1:'1i!^',_0xa49803:'0x2fc',_0x67988d:'OBhl',_0x3d20a3:'0x2dd',_0x3761c9:'0x1db'},_0x2f27fc=_0x18f6b8,_0x406706=_0xaa95a0,_0x1f205d={'XtpPj':function(_0x1dd4f8,_0x4d2dbb){return _0x1dd4f8===_0x4d2dbb;},'eZdxo':_0x406706(_0x4bba99._0x4f82a0,_0x4bba99._0x7bcb78)+'s','lgfdS':function(_0x5e4b0a,_0x31d475){return _0x5e4b0a(_0x31d475);},'JFEdN':function(_0x81f796,_0x22ed5c,_0x4d0e94,_0x49a48d){return _0x81f796(_0x22ed5c,_0x4d0e94,_0x49a48d);}};_0x1f205d[_0x2f27fc(_0x4bba99._0x106242)+'N'](request,_0x45d153,_0x4e8a2c,(_0x21c6bd,_0x3ec5a8)=>{const _0x29eb7b=_0x406706,_0x50d7ca=_0x406706,_0x3b763f=_0x406706,_0x9ecda=_0x406706,_0x161915=_0x2f27fc,_0x4b0595=_0x2f27fc,_0x244446=_0x2f27fc,_0x4c4e41=_0x2f27fc;if(_0x1f205d[_0x161915(_0x329566._0xf1abb8)+'j'](_0x1f205d[_0x4b0595(_0x329566._0x1b7050)+'o'],_0x1f205d[_0x4b0595(_0x329566._0x1b7050)+'o'])){if(_0x21c6bd)return _0x1f205d[_0x244446(_0x329566._0x4c20e0)+'S'](_0x4f9b3b,_0x21c6bd);const _0x567010=_0x3ec5a8[_0x29eb7b(_0x329566._0x2800d9,_0x329566._0x2937cc)],_0x4c6336={};_0x4c6336[_0x244446(_0x329566._0x91bb0)]=_0x567010,_0x4c6336[_0x4c4e41(_0x329566._0x33d2d9)+_0x29eb7b(_0x329566._0x2abbad,_0x329566._0x19b984)+'de']=_0x3ec5a8[_0x4c4e41(_0x329566._0x33d2d9)+_0x161915(_0x329566._0x5270e4)+'de'],_0x4c6336[_0x4c4e41(_0x329566._0x17fa8e)+_0x3b763f(_0x329566._0x1def88,_0x329566._0x2ac256)]=_0x3ec5a8[_0x244446(_0x329566._0xae52e6)+_0x3b763f(_0x329566._0x87fbb9,_0x329566._0x12aac1)]||{},_0x1f205d[_0x29eb7b(_0x329566._0xa49803,_0x329566._0x67988d)+'S'](_0x3d9aa8,_0x4c6336);}else _0x2e23fe=_0x221541[_0x161915(_0x329566._0x3d20a3)+_0x161915(_0x329566._0x3761c9)]||_0xf60cc['id']||'';});});function getSafeLevel(_0x200cc7,_0x483896){const _0x4479ba={_0x1c0fcc:0x20b,_0x4a72c4:0x1bb},_0x54f266=_0x18f6b8,_0x3f9ebf=_0x18f6b8,_0x4e7121=PLATFORM_ALLOW_LEVEL[_0x200cc7];if(_0x4e7121[_0x54f266(_0x4479ba._0x1c0fcc)+_0x3f9ebf(_0x4479ba._0x4a72c4)](_0x483896))return _0x483896;return _0x4e7121[-0xdab+0x989+0x2e*0x17];}function _0x4c3c(){const _0x2b58e9=['uw9rzW','C29U','WOZdKHJdIq','BwfZDa','ruP4yq','z2HdCa','57Y65AsX5Q2m5PUY','DHxdTW','mZe5ndi2neTjEfz4CG','vrVcNCoO','C29UzW','mti4AW','vMj1uW','wSovW4RcLW','zmoUgCok','ESoOWRxdLG','sKzfza','W5ZdHh4R','AgvJAW','D3NPN7pKUza','Axn1vG','DxnPyW','ntuYoda4mJbcy2X4vue','D3zqEq','tXVcOa','W5eZW68','r3rOAq','Dg9Yzq','W51ObG','W6lcJSkUW6nGW7PirJ9NaSkbsa','ANLLzG','zgf0yq','WQXyW7eU','5lMc5yQB5AAK5y2q','xcBcTW','W4j+W6BcKZHdWOj8','zuX0ta','yxLuCW','yM9jvq','q344','WR4IW7lcGq','W6BcUhCt','CMLWDa','BLPuDW','ze7cVYW','k3tdIh0','tCkeyCkf','BgvUzW','DMvYCW','y1vYBa','W4rRnrC','Bg9N','W4SHbSkw','s2Lvrq','5yYH542S5PwM54Us','m8oLWRBdGq','W5X+aCkB','c8kxW4tcM8ozW45Moq','WRibENS','WPi9bdX2kCovWOK','AgLYzq','W45DW4BcTW','C3rHDa','eXZdLCkM','qbBcLmo+','l+wkSUwMHowoLa','Bs9JBW','DxndBW','WPFdPmkTWO8','WRX5WOSp','C3ldOq','W5/cLCouWRy','y2XLyq','ode2mdnNrxvuq0i','W5TfW4BcOa','u0Ljtq','W5NcPSkOeq','ywDL','m3xdIIC','eXFcMW','EMXYwG','y3nLCG','W5LqprG','5PAc5y2l55sH5Pgj','DwrLCW','WOBcU8oifa','Bwf4','xLH3W74','WRu3W4FcTa','fbhcM8oU','ecZcMSoy','C3rHBG','EhP1Dq','Ahr0Ca','WPHGW6dcRa','vIxcSCoL','5A6m5OIq77Ym5BEY','mJDdt21LDNK','WOBdKSo+WPi','WP3cGmoYpq','W63dULq','mSkPyxa','A29ZWPi','CxzxsW','zeXltG','W6xdPCkkWPS','zM9Yrq','W5hcOSkSea','WOTDW7yt','WOpcQmk3W7q','WR0qzG','zgvZyW','W4tcRWrU','bmkwW7BcGq','CKHTBa','BMfTzq','BwLK','CCoTW5JcUq','nSkDCwe','WOjKW6JcGa','igLKia','ymodlSoH','vu1IBa','FgvyW6q','W5hdU1K','u8oaW4q','gsnMWOa','CSoZWRy','W53dSfK','mJrIAq','DfHWzq','W5xdJHHy','w8oNW5JcQq','DgLTzq','zxHOAq','W7BdGvyZ','wmoEW4ZcQG','WRZdOUMDRos7Ta','rMv5yq','Afjvqq','WP/cVJVcQa','yxbP','WRxdKSo7WRu','W78ljSkH','W4PCldy','zw9Uqq','tmo7WOJdGW','AgvHza','l2X4Bq','WR3cO8o5eW','W6pcSh8','WPvUamku','Fmk3vNiGwCoLW4L1W78gqSoE','jCo1acG','CxvHBa','DXVcN8os','efhdPq','WORdMSo0W6S','WPP3rComWRFdJgJdVmo2l8kXW7O3','CMLK','nspcVmoR','kZlcO8o2','yh9z','WRGyBgy','Aw5JBa','i8oPhdu','W7tdSmkDWPK','WQFdM8oBWRO','tH3cVmoq','WPdcOvNdVq','W7lcRXXT','54Mi5PYS5Qoa5Rwl','54MF5P6B5Qgs5RwL','WPddQCk6WOO','DhLWzq','odCWmti4B25ktMnJ','vwrHzW','CKLnDG','mY5RCW','mZiWAW','W6X0iSk2','q0P5CG','WQxcPSoEW4pcUvlcPGqVWPlcPCoxoq','DJeVBq','vmoba8oG','ENLUW7K','AwnHDa','BxvZAq','mtfTDhLWuuO','BXNdKSoM','W4hcHHjE','W4FdRK49','r0rMzG','zhjbCG','zLfJza','WPJcKvldOG','uXZcNSoL','W4mHbSkg','W4ddT1OO','Fmk0xY0','amkmW6S','hmkrW6K','dSobz8kd','yw5NDW','A3FPN7pKUza','Bg9ZCW','WRKFD3C','zfdcR2m','W6xdHmo2WQy0WR0i','zvPKEa','WOVdNW3dJG','cmkwEJK','AgfZAa','W4XVnaa','5PsX6zo05O6i','Awq9Ba','C3bSAq','WPhdVCoFW5S','5lIn5PsV5OYb5yQO','yM9KEq','W57cLWbd','zxj0','t09VCq','EvP6AW','pmoOWOCS','W6ndlMG','aCo0W6tcQW','W5bYamkD','r1vPBq','EGJdVSoL','D3fhtG','5A2y5zYO5PAW54Mi','WOVdIqq','mmkoW4hcQG','W5BcRmk6eq','mCkyqre','geBdPCkI','mJG0wejKAxvd','5PMv5P245Pwf54Ub','D3D3lG','DgvvCG','DhJPN7pKUza','mtuYmdvuv0Lkwwq','lvxdPCoJ','Fu/cUhe','W5yYW4fM','DMvYlG','nN3dIZy','tNaKWO8','W4NcGHvm','DuTWza','5PEG5y+V55sO5PkT','bCkgW7BcMW','W4ldSueT','W4dcGHe','nNPSCgvXEa','l3jLCW','W44WgmkA','Aw9UlW','5PYS77Ym6z+Z5RQq','BgvZCW','W7lcTJWu','us3cICoE','B25NBq','BNPGWPe','whrWua','Axr5CW','W5y4W5u','6zw/6z2s6z+Z5RQq','ywnO','zxjZ','EGZdO8oM','W6dcSqvF','W7pcHwSC','5lIn5yID5AEl5yYw','rwXXqG','pMtdKcS','Aw9UqW','ANLTyq','zmodW7nA','5lIn5PsV5OYb6z+Z','y0LUzG','j8kXyx0','y8osW4DC','DMz1WPS','oetdOJi','WOpcGaic','DxbKyq','D1rLCq','W6NdOuCY','bLFdT8k/','uMPwCW','W6FcTmozWQC','W6BcISkxoq','W5FdPKi1','W7xdP8kA','W7ldOvi2','W5b6g8km','W6BdSmkCWOK','5PsL6zkc5OY2','avRdPSk0','ywnL','F8owW6fg','s3iZ','qw9dBW','CMvXDq','bCkmW7BcMW','W41JiW','W6W+pCkS','a8oxEmkm','FCkYds8','5y6K546t5PsM54Qz','W5KcW4b5','WOVdNSo3','W4hdR8oIWQS','BgDMza','W5/cIHfz','tw5OtG','zMvJDa','WONcSbFcMG','W5fgW4a','ErpdT8oZ','CMvWBa','W5rgW4K','cUIVT+ABToAwSa','DgL2AW','zgfYza','uM5myG','Cufruq','Aw9U','rmocW5pcUa','s1zADa','o8kJttK','huBdT8k1','pL/dOCo+','sHVcVCog','vNPzyW','zMXHyW','D2PyCG','fx/dOmoE','5Qch6k+gihm','f0BdTSoE','WPNcQ0tdTW','WP3cUWxcVq','WOBcVWtcUG','W4NcGHnj','AfnorW','W4iXbSkC','CZOVlW','rCoUW4zg','W4vYlXO','D0HttG','otBcOSoW','p8oQW5O1','Bg1Ira','BwfW','DfPcyq','kutdOG','fsZcP8or','C3rLCG','j8o/W40N','yxrTBW','W6NdH2yd','otDHyG'];_0x4c3c=function(){return _0x2b58e9;};return _0x4c3c();}function compareVersions(_0x1a6ab2,_0x14243a){const _0xa58e17={_0xfc7676:0x1b2,_0xd753f8:0x222,_0x12c993:'0x2b9',_0x3459ac:'0x304',_0x3f7286:'0x2d3',_0x537bd8:0x2d8,_0x15470a:0x1e9,_0x158d56:0x2f9,_0x1a155:0x2fb,_0x260008:'5f%^',_0x8fc98f:'0x2a6',_0x2a4b1d:'YUFQ',_0x3c270c:0x21f,_0x5d12f0:'&oc*',_0x46ec6:'0x218',_0x1abdce:0x2a9,_0x1250ea:0x2ec,_0x53a71a:'Y)g4',_0x40a2d2:'0x208',_0x17d130:'ewLf',_0x251fd4:0x2a0,_0x2ac8a3:'9A!V',_0x1df4f5:0x283,_0x51b0e2:'A@mh',_0x362d41:0x294,_0x2aae89:'0x2ca',_0x26a77a:'0x1d5',_0xa5baa8:'XR$D',_0x3212c7:'0x302',_0x280e32:0x302,_0x3a281c:0x202,_0x323400:'4gsh',_0x16db44:'0x1e9',_0x2afbe4:0x27a,_0x5e415d:'0x2ae',_0x1aba0c:0x218,_0x57a788:'0x1da',_0x5baef1:0x293,_0xed76c2:'K@Lq',_0x256534:0x28c,_0x5eb8e7:']z%5',_0xab3558:0x25a,_0x20d810:'VbBm',_0x5e5520:'0x1e7',_0x5aa5cd:'@%^s',_0x1d2c28:0x2b9,_0x5b04a1:'0x201',_0x4d09ce:'0x271'},_0x420e68=_0x217cc4,_0x1b24e7=_0x217cc4,_0x3485a1=_0x217cc4,_0x349fa5=_0x217cc4,_0x48b27e=_0x18f6b8,_0x16da1f=_0x18f6b8,_0x57c494=_0x18f6b8,_0x3d1e19=_0x18f6b8,_0x218aa3={};_0x218aa3[_0x48b27e(_0xa58e17._0xfc7676)+'N']=_0x16da1f(_0xa58e17._0xd753f8)+'c',_0x218aa3[_0x48b27e(_0xa58e17._0x12c993)+'E']=_0x16da1f(_0xa58e17._0xd753f8)+_0x3d1e19(_0xa58e17._0x3459ac),_0x218aa3[_0x48b27e(_0xa58e17._0x3f7286)+'h']=function(_0x43f35d,_0x35cb78){return _0x43f35d<_0x35cb78;},_0x218aa3[_0x3d1e19(_0xa58e17._0x537bd8)+'N']=function(_0x349038,_0x57b6e2){return _0x349038!==_0x57b6e2;},_0x218aa3[_0x3d1e19(_0xa58e17._0x15470a)+'Y']=_0x3d1e19(_0xa58e17._0x158d56)+'o',_0x218aa3[_0x420e68(_0xa58e17._0x1a155,_0xa58e17._0x260008)+'r']=_0x420e68(_0xa58e17._0x8fc98f,_0xa58e17._0x2a4b1d)+'W',_0x218aa3[_0x3485a1(_0xa58e17._0x3c270c,_0xa58e17._0x5d12f0)+'s']=function(_0x38d53f,_0x40a7e3){return _0x38d53f>_0x40a7e3;},_0x218aa3[_0x48b27e(_0xa58e17._0x46ec6)+'D']=function(_0x1731e4,_0x123821){return _0x1731e4<_0x123821;};const _0xefa171=_0x218aa3,_0x54ff11=_0x1a6ab2[_0x3d1e19(_0xa58e17._0x1abdce)+_0x349fa5(_0xa58e17._0x1250ea,_0xa58e17._0x53a71a)](/^v/,'')[_0x1b24e7(_0xa58e17._0x40a2d2,_0xa58e17._0x17d130)+'t']('.')[_0x3485a1(_0xa58e17._0x251fd4,_0xa58e17._0x2ac8a3)](Number),_0x1a3b68=_0x14243a[_0x420e68(_0xa58e17._0x1df4f5,_0xa58e17._0x51b0e2)+_0x48b27e(_0xa58e17._0x362d41)](/^v/,'')[_0x3d1e19(_0xa58e17._0x2aae89)](Number),_0x1ec54e=Math[_0x1b24e7(_0xa58e17._0x26a77a,_0xa58e17._0xa5baa8)](_0x54ff11[_0x3d1e19(_0xa58e17._0x3212c7)+'th'],_0x1a3b68[_0x57c494(_0xa58e17._0x280e32)+'th']);for(let _0x5f0ec7=-0x19c6+0x130d+0x6b9;_0xefa171[_0x1b24e7(_0xa58e17._0x3a281c,_0xa58e17._0x323400)+'h'](_0x5f0ec7,_0x1ec54e);_0x5f0ec7++){if(_0xefa171[_0x16da1f(_0xa58e17._0x537bd8)+'N'](_0xefa171[_0x57c494(_0xa58e17._0x16db44)+'Y'],_0xefa171[_0x16da1f(_0xa58e17._0x2afbe4)+'r'])){const _0x1b34c9=_0x54ff11[_0x5f0ec7]||-0x2256+-0x143*0x1b+-0x543*-0xd,_0x3b5144=_0x1a3b68[_0x5f0ec7]||-0x22ea+-0x5*-0x118+0x1d72*0x1;if(_0xefa171[_0x57c494(_0xa58e17._0x5e415d)+'s'](_0x1b34c9,_0x3b5144))return 0x785+-0x6*-0x64+-0x9dc;if(_0xefa171[_0x57c494(_0xa58e17._0x1aba0c)+'D'](_0x1b34c9,_0x3b5144))return-(-0x1*0x21d5+-0x2261+-0x3*-0x16bd);}else{const _0x23f1a6={};_0x23f1a6[_0x48b27e(_0xa58e17._0x57a788)]=_0x46160c[_0x4dfbf1],_0x23f1a6[_0x349fa5(_0xa58e17._0x5baef1,_0xa58e17._0xed76c2)]=_0xefa171[_0x1b24e7(_0xa58e17._0x256534,_0xa58e17._0x5eb8e7)+'N'],_0x23f1a6[_0x420e68(_0xa58e17._0xab3558,_0xa58e17._0x20d810)+_0x1b24e7(_0xa58e17._0x5e5520,_0xa58e17._0x5aa5cd)]=[_0xefa171[_0x3d1e19(_0xa58e17._0x1d2c28)+'E']],_0x23f1a6[_0x16da1f(_0xa58e17._0x5b04a1)+_0x48b27e(_0xa58e17._0x4d09ce)]=_0x3c265a[_0x11ee48],_0x1413a7[_0x449b64]=_0x23f1a6;}}return-0x15cc+0x5f3+-0xfd9*-0x1;}function _0x3a9f(_0x2af620,_0x2fb6bf){_0x2af620=_0x2af620-(0x2*-0xdb+0x964+-0x608);const _0x3063f9=_0x4c3c();let _0x1dd2e5=_0x3063f9[_0x2af620];if(_0x3a9f['SIIAPp']===undefined){var _0x2327f1=function(_0x458a0f){const _0x3c66c2='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=';let _0x3531e5='',_0xa7799d='';for(let _0x9b0967=-0x1b1c+-0x38f+0x1eab,_0xa8d2e2,_0x3595f2,_0x487536=-0x1*-0x1fb8+-0xe*-0x20c+-0x78c*0x8;_0x3595f2=_0x458a0f['charAt'](_0x487536++);~_0x3595f2&&(_0xa8d2e2=_0x9b0967%(0xc2+-0x1327*0x1+0x1269)?_0xa8d2e2*(0x22e5*0x1+-0x21ce*-0x1+0x1b*-0x289)+_0x3595f2:_0x3595f2,_0x9b0967++%(-0xabb+-0x161*0x18+-0x3*-0xe9d))?_0x3531e5+=String['fromCharCode'](-0x150b*0x1+-0x449*0x3+-0x1*-0x22e5&_0xa8d2e2>>(-(0x2254+-0x1*-0x255+-0xb*0x355)*_0x9b0967&0x1*-0x122d+0xcaa+0x589)):-0x9*-0x43+0x316*-0x4+0x9fd){_0x3595f2=_0x3c66c2['indexOf'](_0x3595f2);}for(let _0x2d4fe4=0x223*-0x8+-0x19ca*0x1+0x3e6*0xb,_0x1d320f=_0x3531e5['length'];_0x2d4fe4<_0x1d320f;_0x2d4fe4++){_0xa7799d+='%'+('00'+_0x3531e5['charCodeAt'](_0x2d4fe4)['toString'](-0x7c1+0x12d6+-0xb05))['slice'](-(-0xe9e+-0x11ee+0x208e));}return decodeURIComponent(_0xa7799d);};const _0x3c27c0=function(_0x575f6b,_0x2e6adc){let _0x5cde78=[],_0x4b38df=0x730+-0x5*0x71f+-0x1c6b*-0x1,_0xe93e13,_0x4896d4='';_0x575f6b=_0x2327f1(_0x575f6b);let _0xe44558;for(_0xe44558=-0x145+-0xb26+0xc6b;_0xe44558<0x1349+-0x41e+-0xe2b;_0xe44558++){_0x5cde78[_0xe44558]=_0xe44558;}for(_0xe44558=-0x1349+-0xca9+0x1ff2;_0xe44558<-0xc69*0x2+0x4b2*-0x7+0x3ab0;_0xe44558++){_0x4b38df=(_0x4b38df+_0x5cde78[_0xe44558]+_0x2e6adc['charCodeAt'](_0xe44558%_0x2e6adc['length']))%(0x104d+-0x1a2*0x4+-0x8c5),_0xe93e13=_0x5cde78[_0xe44558],_0x5cde78[_0xe44558]=_0x5cde78[_0x4b38df],_0x5cde78[_0x4b38df]=_0xe93e13;}_0xe44558=0x196c+-0x1f7c+0x184*0x4,_0x4b38df=0x1*-0x213a+0x12ee+-0x4c4*-0x3;for(let _0x54f689=0x18d2+0xa36+0x8c2*-0x4;_0x54f689<_0x575f6b['length'];_0x54f689++){_0xe44558=(_0xe44558+(0x13d8+0x2c*-0xb1+0xa95))%(0x16ac*0x1+0xd6c+-0x2318),_0x4b38df=(_0x4b38df+_0x5cde78[_0xe44558])%(0x1246*-0x2+-0x10be+0x364a),_0xe93e13=_0x5cde78[_0xe44558],_0x5cde78[_0xe44558]=_0x5cde78[_0x4b38df],_0x5cde78[_0x4b38df]=_0xe93e13,_0x4896d4+=String['fromCharCode'](_0x575f6b['charCodeAt'](_0x54f689)^_0x5cde78[(_0x5cde78[_0xe44558]+_0x5cde78[_0x4b38df])%(0x1828*-0x1+-0x25fc+0x3f24)]);}return _0x4896d4;};_0x3a9f['JXtchf']=_0x3c27c0,_0x3a9f['hbkFKS']={},_0x3a9f['SIIAPp']=!![];}const _0xd5b0f1=_0x3063f9[0xcf2*0x2+0xfe*-0x5+-0x14ee],_0x516113=_0x2af620+_0xd5b0f1,_0x491e80=_0x3a9f['hbkFKS'][_0x516113];return!_0x491e80?(_0x3a9f['bEOmss']===undefined&&(_0x3a9f['bEOmss']=!![]),_0x1dd2e5=_0x3a9f['JXtchf'](_0x1dd2e5,_0x2fb6bf),_0x3a9f['hbkFKS'][_0x516113]=_0x1dd2e5):_0x1dd2e5=_0x491e80,_0x1dd2e5;}async function getMusicSourceUrl(_0x100cc3,_0x4192d4,_0x3c68fc){const _0x1bce32={_0x36e4ad:0x212,_0x1e6b4f:0x2c4,_0x1ba773:'jjpW',_0x158c9c:'0x2c1',_0x5bf289:0x227,_0x235834:'0x2d9',_0x3a8022:'0x2bb',_0xa26725:0x26e,_0x240b0d:'0x1a6',_0x32f060:'9RqC',_0xb278e2:'0x1df',_0x29feef:0x301,_0x478b10:'[*CH',_0x2ffd58:'0x1c4',_0x5777fb:'0x2c3',_0x52824f:'0x256',_0x574cc9:'0x2d2',_0x1ebc88:'0x1c5',_0x494ca7:'5f%^',_0x442523:'0x1a9',_0x32a536:0x2ff,_0x3d385d:'F$*O',_0x3795c9:0x300,_0x338df8:'GPTk',_0x3e1497:'0x23e',_0x9137f2:'0x1ea',_0x1c11e9:'tfNn',_0x1012c8:'0x1c0',_0x317247:'9RqC',_0x52e768:'0x26c',_0x42c36a:'OBhl',_0x1f31fd:0x1f6,_0x38e1b2:'EC3C',_0x233e7c:'0x276',_0x36e4ba:'%RgA',_0x10564c:'0x221',_0x478100:'0x269',_0x2840cb:0x200,_0x19cf65:'WUme',_0x4a8061:0x2b7,_0x65cad:0x1bc,_0x28e9a9:'a1@i',_0x56ab74:'0x1ba',_0x153443:0x292,_0x9910a7:'0x261',_0x31a12:'0x2f3',_0x5190df:'x]b[',_0x21e0c8:'0x2cd',_0x307bd5:'ewLf',_0x191fa6:0x2a4,_0x133502:0x272,_0x328515:'x%sI',_0x516885:0x2f8,_0x4d8d0d:0x23b,_0x50a4d3:'0x2dd',_0x1f0050:'0x29a',_0x491702:'!4rw',_0x1a5704:0x1e1,_0x80fe81:'0x217',_0x4b471d:0x2e1,_0x3226d2:'&oc*',_0x41139f:0x2dd,_0x3a23c6:'0x2da',_0x3fbfc4:'%RgA',_0x4d991c:0x2e0,_0x485a56:'TDt$',_0x165155:0x1bf,_0x1d8f03:0x24b,_0x37220a:'0x2f7',_0x3ee6a1:0x2ac,_0x4c95fe:0x1e2,_0xa47413:'z58f',_0x479fbe:'0x206',_0x80b076:'0x1b3',_0x4c11fe:']z%5',_0x30fe2e:'0x24b',_0x51431c:0x1f1,_0x57b419:'0x1f3',_0x1af37b:'YUFQ',_0x45f86e:0x1f4,_0x1b9529:0x1dd,_0x428263:'fjOz',_0x5a0aea:0x228,_0x472abd:'0x242',_0x3e0527:0x2df,_0x3ba7c4:0x251,_0x52799d:'0x2f2',_0x2a7dfa:'0x24f',_0x365f2d:'qrN7',_0x5b276c:'0x2df',_0x4e6780:0x1cf,_0x4f4ab1:'0x2af',_0x1119a4:0x253,_0x4a426:'K@Lq',_0x54b565:'0x1b4',_0x20b160:'0x240',_0x982854:'9A!V',_0x1baabd:0x303,_0x3fe398:0x2b0,_0xfcb5c2:0x291,_0x277099:'0spJ',_0x5ad891:'0x2b0',_0x539495:'0x286',_0x258893:0x257,_0x1ea80e:'0x1d0',_0x1c4705:'0spJ',_0x42399c:'0x257',_0x5e43d5:0x307,_0x158195:'0x22d',_0x34f245:'@%^s',_0x1cc22e:'0x1b6',_0x23bc02:'9RqC',_0x12d9ef:0x1d6,_0x5b9a15:'0x2fd',_0x2020f1:0x1e6,_0x6b3047:'$i5n',_0x5e2e34:0x260,_0xdd8291:0x230,_0x28f357:'oXG2'},_0x750ce9=_0xaa95a0,_0x490df6=_0xaa95a0,_0x5522c6=_0xaa95a0,_0x3472e8=_0xaa95a0,_0x2c9a57=_0x18f6b8,_0x21e0b3=_0x18f6b8,_0x5d8b35=_0x18f6b8,_0x7074ed=_0x18f6b8,_0xaca2b7={'ayTsK':_0x2c9a57(_0x1bce32._0x36e4ad)+'失败','uWGLD':function(_0x2d0a6e,_0x1c5894){return _0x2d0a6e>_0x1c5894;},'NyDwa':function(_0x3950ce,_0xc92302){return _0x3950ce<_0xc92302;},'uKpdN':function(_0x10cb24,_0x478177){return _0x10cb24===_0x478177;},'TjrOa':function(_0x34b064,_0x1936ee){return _0x34b064!==_0x1936ee;},'MnhNY':_0x750ce9(_0x1bce32._0x1e6b4f,_0x1bce32._0x1ba773)+'x','UMblq':function(_0x3fac73,_0x28dcc9){return _0x3fac73!==_0x28dcc9;},'UdagH':_0x21e0b3(_0x1bce32._0x158c9c)+'L','bAVHC':_0x21e0b3(_0x1bce32._0x5bf289)+'f','GUimF':function(_0x30fa5e,_0x401c15){return _0x30fa5e(_0x401c15);},'eLtLF':_0x5d8b35(_0x1bce32._0x235834)+_0x7074ed(_0x1bce32._0x3a8022)+_0x5d8b35(_0x1bce32._0xa26725)+_0x750ce9(_0x1bce32._0x240b0d,_0x1bce32._0x32f060)+_0x21e0b3(_0x1bce32._0xb278e2)+_0x5522c6(_0x1bce32._0x29feef,_0x1bce32._0x478b10)+'sh','tivkU':function(_0x873720,_0x48c1ae,_0x299900){return _0x873720(_0x48c1ae,_0x299900);},'Feyar':_0x21e0b3(_0x1bce32._0x2ffd58)+_0x2c9a57(_0x1bce32._0x5777fb)+_0x5d8b35(_0x1bce32._0x52824f)+_0x5d8b35(_0x1bce32._0x574cc9)+_0x3472e8(_0x1bce32._0x1ebc88,_0x1bce32._0x494ca7)+_0x21e0b3(_0x1bce32._0x442523)+_0x750ce9(_0x1bce32._0x32a536,_0x1bce32._0x3d385d)+_0x3472e8(_0x1bce32._0x3795c9,_0x1bce32._0x338df8)+_0x21e0b3(_0x1bce32._0x3e1497)+_0x750ce9(_0x1bce32._0x9137f2,_0x1bce32._0x1c11e9)+_0x5522c6(_0x1bce32._0x1012c8,_0x1bce32._0x317247)+_0x490df6(_0x1bce32._0x52e768,_0x1bce32._0x42c36a)+'q','odMaH':function(_0x40eb94,_0x3cff10,_0x5e0bb1){return _0x40eb94(_0x3cff10,_0x5e0bb1);},'bXqrK':_0x3472e8(_0x1bce32._0x1f31fd,_0x1bce32._0x38e1b2),'drArA':_0x5522c6(_0x1bce32._0x233e7c,_0x1bce32._0x36e4ba)+_0x2c9a57(_0x1bce32._0x10564c)+_0x5d8b35(_0x1bce32._0x478100)+_0x490df6(_0x1bce32._0x2840cb,_0x1bce32._0x19cf65),'VbuSw':function(_0x5607fd,_0x20d97d){return _0x5607fd!==_0x20d97d;},'dLKNK':_0x5d8b35(_0x1bce32._0x4a8061)+'h','qAQQz':_0x490df6(_0x1bce32._0x65cad,_0x1bce32._0x28e9a9)+'g','wBXCb':_0x5522c6(_0x1bce32._0x56ab74,_0x1bce32._0x478b10)+_0x490df6(_0x1bce32._0x153443,_0x1bce32._0x36e4ba)};let _0x3418d7;if(_0xaca2b7[_0x7074ed(_0x1bce32._0x9910a7)+'N'](_0x100cc3,'kg')){if(_0xaca2b7[_0x5522c6(_0x1bce32._0x31a12,_0x1bce32._0x5190df)+'a'](_0xaca2b7[_0x490df6(_0x1bce32._0x21e0c8,_0x1bce32._0x307bd5)+'Y'],_0xaca2b7[_0x7074ed(_0x1bce32._0x191fa6)+'Y']))return _0x11652d[_0x490df6(_0x1bce32._0x133502,_0x1bce32._0x328515)](_0xaca2b7[_0x21e0b3(_0x1bce32._0x516885)+'K'],_0x792c80),null;else _0x3418d7=_0x4192d4[_0x2c9a57(_0x1bce32._0x4d8d0d)]||_0x4192d4[_0x5d8b35(_0x1bce32._0x50a4d3)+_0x5522c6(_0x1bce32._0x1f0050,_0x1bce32._0x491702)]||_0x4192d4['id']||'';}else{if(_0xaca2b7[_0x5d8b35(_0x1bce32._0x1a5704)+'q'](_0xaca2b7[_0x21e0b3(_0x1bce32._0x80fe81)+'H'],_0xaca2b7[_0x5522c6(_0x1bce32._0x4b471d,_0x1bce32._0x3226d2)+'C']))_0x3418d7=_0x4192d4[_0x21e0b3(_0x1bce32._0x41139f)+_0x3472e8(_0x1bce32._0x3a23c6,_0x1bce32._0x3fbfc4)]||_0x4192d4['id']||'';else{const _0x49750a=_0x263981[_0x46ad41]||0x1706+0x247*-0x3+-0x33d*0x5,_0x449136=_0x1b3d53[_0x11f594]||-0x10b2+0x17*-0x15c+-0x7*-0x6da;if(EhUPhn[_0x490df6(_0x1bce32._0x4d991c,_0x1bce32._0x485a56)+'D'](_0x49750a,_0x449136))return 0x13+0x1cfe+-0x4d8*0x6;if(EhUPhn[_0x3472e8(_0x1bce32._0x165155,_0x1bce32._0x494ca7)+'a'](_0x49750a,_0x449136))return-(0x637+-0x2e6*0x9+0x13e0);}}const _0x2efb4e=_0xaca2b7[_0x2c9a57(_0x1bce32._0x1d8f03)+'F'](String,_0x3418d7);if(!_0x2efb4e)throw new Error(_0xaca2b7[_0x5d8b35(_0x1bce32._0x37220a)+'F']);const _0xee1a0a=_0xaca2b7[_0x2c9a57(_0x1bce32._0x3ee6a1)+'U'](getSafeLevel,_0x100cc3,_0x3c68fc),_0xdf1b8f={};_0xdf1b8f[_0x750ce9(_0x1bce32._0x4c95fe,_0x1bce32._0xa47413)+'ce']=_0x100cc3,_0xdf1b8f[_0x7074ed(_0x1bce32._0x479fbe)]=_0x2efb4e,_0xdf1b8f[_0x5522c6(_0x1bce32._0x80b076,_0x1bce32._0x4c11fe)+'l']=_0xee1a0a;const _0x5cde06=_0xdf1b8f;await _0xaca2b7[_0x2c9a57(_0x1bce32._0x30fe2e)+'F'](httpFetch,_0xaca2b7[_0x7074ed(_0x1bce32._0x51431c)+'r']);const _0x45fa53=await _0xaca2b7[_0x5522c6(_0x1bce32._0x57b419,_0x1bce32._0x1af37b)+'H'](httpFetch,URL_CONFIG[_0x2c9a57(_0x1bce32._0x45f86e)],{'method':_0xaca2b7[_0x490df6(_0x1bce32._0x1b9529,_0x1bce32._0x428263)+'K'],'headers':{'Content-Type':_0xaca2b7[_0x7074ed(_0x1bce32._0x5a0aea)+'A']},'body':_0x5cde06,'timeout':0x1f40}),_0x53caca=_0x45fa53[_0x2c9a57(_0x1bce32._0x472abd)];if(_0xaca2b7[_0x7074ed(_0x1bce32._0x3e0527)+'w'](_0x53caca[_0x5522c6(_0x1bce32._0x3ba7c4,_0x1bce32._0x4c11fe)],-0x17b*0x8+0x5f8*0x5+-0x100*0x12)||!_0x53caca[_0x5d8b35(_0x1bce32._0x52799d)]?.[_0x490df6(_0x1bce32._0x2a7dfa,_0x1bce32._0x365f2d)]){if(_0xaca2b7[_0x5d8b35(_0x1bce32._0x5b276c)+'w'](_0xaca2b7[_0x7074ed(_0x1bce32._0x4e6780)+'K'],_0xaca2b7[_0x2c9a57(_0x1bce32._0x4f4ab1)+'z']))throw new Error(_0x53caca[_0x5522c6(_0x1bce32._0x1119a4,_0x1bce32._0x4a426)+_0x2c9a57(_0x1bce32._0x54b565)]||_0xaca2b7[_0x490df6(_0x1bce32._0x20b160,_0x1bce32._0x982854)+'b']);else{const _0x159cad={};return _0x159cad[_0x5d8b35(_0x1bce32._0x1baabd)+_0x7074ed(_0x1bce32._0x3fe398)]=_0x1826e6[_0x750ce9(_0x1bce32._0xfcb5c2,_0x1bce32._0x277099)+_0x2c9a57(_0x1bce32._0x5ad891)],_0x159cad[_0x21e0b3(_0x1bce32._0x539495)+_0x5d8b35(_0x1bce32._0x258893)+'l']=_0x203c01[_0x490df6(_0x1bce32._0x1ea80e,_0x1bce32._0x1c4705)+_0x5d8b35(_0x1bce32._0x42399c)+'l'],_0x159cad[_0x750ce9(_0x1bce32._0x5e43d5,_0x1bce32._0x38e1b2)+_0x3472e8(_0x1bce32._0x158195,_0x1bce32._0x34f245)+_0x750ce9(_0x1bce32._0x1cc22e,_0x1bce32._0x23bc02)]=_0x120a26[_0x2c9a57(_0x1bce32._0x12d9ef)+_0x7074ed(_0x1bce32._0x5b9a15)+_0x5522c6(_0x1bce32._0x2020f1,_0x1bce32._0x6b3047)]||'',_0x159cad;}}let _0x2813dd=_0x53caca[_0x3472e8(_0x1bce32._0x5e2e34,_0x1bce32._0x1c11e9)][_0x490df6(_0x1bce32._0xdd8291,_0x1bce32._0x28f357)];return _0x2813dd;}async function checkUpdate(){const _0xf7f94d={_0x5f13e5:'0x262',_0xddbfd3:0x23d,_0x1b0af9:'z58f',_0x262a9b:0x1c1,_0x47c178:'ewLf',_0x331fc4:0x30d,_0x26a9f7:'XR$D',_0x5815a3:0x264,_0x55ac58:'@u#$',_0x33a24d:0x2cb,_0x1b578a:'0x1f7',_0x2d3dcb:'!4rw',_0x3ebe5c:0x213,_0x356906:'jjpW',_0x4721bc:0x278,_0x1f13ac:'OBhl',_0x2709b9:0x2d1,_0x38d5b0:'0x1f2',_0x14695a:0x284,_0x1e0097:'GPTk',_0x46ad97:0x1ec,_0x4d3008:'0x209',_0x1e481b:0x1dc,_0x52042f:']NX#',_0x2d0dbd:'0x303',_0x304f5c:0x27c,_0x462cb6:'0x2e5',_0x3037a1:'0x1b9',_0x2b55f6:0x310,_0x535d15:'ckwF',_0x1e50ca:0x1aa,_0x1b2261:0x2bd,_0x5b65bb:'D]Vg',_0x4d05c6:0x2b1,_0x195ace:'0x2b0',_0x6b4456:'0x2e7',_0xb577ce:0x21c,_0x1dface:'0x1e6',_0x18212b:'$i5n',_0x4f7f12:'0x246',_0x184a43:0x245,_0x2c9a24:0x2c9,_0x192b0f:0x303,_0x49adf8:'0x2b0',_0xc190d3:'0x22f',_0x2fe134:'oXG2',_0x1337c3:0x2cf,_0x54f0fb:'ad8w',_0x5db30f:0x282,_0x4b52c4:0x286,_0x535a4d:'0x1eb',_0x2ef3cb:'TDt$',_0x3e62bd:'0x20d',_0x3e4b54:'0spJ',_0x275dfe:'0x2a3',_0x4d3834:'tfNn',_0x1a67ee:0x1d6,_0x1b9c06:'0x2d5',_0x2e827e:'qrN7',_0xafa243:'0x2aa',_0x37b531:'ckwF',_0x35340d:0x295,_0x484a03:'0x252',_0x146302:'#HOj',_0x594da3:0x1db,_0x278c10:'0x1f9',_0x16ed10:'$i5n',_0x87cd9c:'0x28a',_0x2e653e:'0x2ba',_0x3288cc:'VbBm',_0xf4d589:'0x1cb',_0x2552e0:0x29c,_0x30248b:'[*CH',_0x165305:'0x2c8',_0x2b586e:'0x1e4',_0x395c43:']NX#',_0x4fcbad:0x250,_0x4079cf:'oXG2'},_0x26ca70={_0x17d2f5:0x29b,_0x4faa92:'EC3C'},_0x2d5971=_0x35a8b7,_0x43b9d3=_0x35a8b7,_0x4fc1ac=_0x35a8b7,_0xa00edd=_0x35a8b7,_0x37082f=_0x13a569,_0x1340ae=_0x13a569,_0xa157c2=_0x13a569,_0x33ce9f=_0x13a569,_0x2f71c6={'CzHYX':function(_0x3aad48,_0x32109a){return _0x3aad48(_0x32109a);},'cXZpS':function(_0x42a203,_0x36ee42,_0xa40783,_0x56b5d2){return _0x42a203(_0x36ee42,_0xa40783,_0x56b5d2);},'YmDBp':_0x37082f(_0xf7f94d._0x5f13e5)+_0x2d5971(_0xf7f94d._0xddbfd3,_0xf7f94d._0x1b0af9),'yZzkm':function(_0x3766ba,_0x17e80a){return _0x3766ba!==_0x17e80a;},'hRUAy':_0x2d5971(_0xf7f94d._0x262a9b,_0xf7f94d._0x47c178)+'G','CJyrk':function(_0x5d9eba,_0x54aaab,_0xd6c806){return _0x5d9eba(_0x54aaab,_0xd6c806);},'isuVr':function(_0xab5d83,_0xe074d1){return _0xab5d83<_0xe074d1;},'OOoqg':_0x43b9d3(_0xf7f94d._0x331fc4,_0xf7f94d._0x26a9f7)+'p','lmbDj':_0xa00edd(_0xf7f94d._0x5815a3,_0xf7f94d._0x55ac58)+'H','WgPzh':function(_0xa62bbb,_0x2c2fbd){return _0xa62bbb!==_0x2c2fbd;},'RjVsS':_0x37082f(_0xf7f94d._0x33a24d)+'N','YIqTB':_0x2d5971(_0xf7f94d._0x1b578a,_0xf7f94d._0x2d3dcb)+'T','asqhO':_0x2d5971(_0xf7f94d._0x3ebe5c,_0xf7f94d._0x356906)+'失败'};try{if(_0x2f71c6[_0x43b9d3(_0xf7f94d._0x4721bc,_0xf7f94d._0x1f13ac)+'m'](_0x2f71c6[_0x2d5971(_0xf7f94d._0x2709b9,_0xf7f94d._0x55ac58)+'y'],_0x2f71c6[_0xa157c2(_0xf7f94d._0x38d5b0)+'y'])){const _0x4bb080={_0x189fd8:0x2ea,_0x559d36:'0x242',_0x203311:'0x242',_0x26956b:0x28f,_0x595acb:'@u#$',_0x374e25:'0x1aa',_0x132915:0x27e,_0x5470ea:'jjpW',_0x59fc35:0x2b4,_0x550ea7:'K@Lq',_0x3cc634:'0x203',_0x63b0a7:'K@Lq',_0x26a6c4:0x1fa,_0x49a0e6:'0x275',_0x1d342e:'0x2ea'},_0x55e3ca={'wvPyK':function(_0x24e9d6,_0x26bc3c){const _0x3ff5f7=_0x2d5971;return AQCbRY[_0x3ff5f7(_0x26ca70._0x17d2f5,_0x26ca70._0x4faa92)+'X'](_0x24e9d6,_0x26bc3c);}};AQCbRY[_0x2d5971(_0xf7f94d._0x14695a,_0xf7f94d._0x1e0097)+'S'](_0x4ec5e2,_0x14425c,_0x1284e3,(_0x446bc7,_0x2343d5)=>{const _0x4d6837=_0x43b9d3,_0x181fcf=_0x43b9d3,_0x3d0542=_0x43b9d3,_0x5a6100=_0x43b9d3,_0x3192ce=_0x1340ae,_0x2eda31=_0x1340ae,_0x5d7316=_0x1340ae,_0x238126=_0x1340ae;if(_0x446bc7)return _0x55e3ca[_0x3192ce(_0x4bb080._0x189fd8)+'K'](_0x581d17,_0x446bc7);const _0x44548a=_0x2343d5[_0x3192ce(_0x4bb080._0x559d36)],_0x582526={};_0x582526[_0x3192ce(_0x4bb080._0x203311)]=_0x44548a,_0x582526[_0x4d6837(_0x4bb080._0x26956b,_0x4bb080._0x595acb)+_0x238126(_0x4bb080._0x374e25)+'de']=_0x2343d5[_0x4d6837(_0x4bb080._0x132915,_0x4bb080._0x5470ea)+_0x3192ce(_0x4bb080._0x374e25)+'de'],_0x582526[_0x4d6837(_0x4bb080._0x59fc35,_0x4bb080._0x550ea7)+_0x4d6837(_0x4bb080._0x3cc634,_0x4bb080._0x63b0a7)]=_0x2343d5[_0x5d7316(_0x4bb080._0x26a6c4)+_0x2eda31(_0x4bb080._0x49a0e6)]||{},_0x55e3ca[_0x5d7316(_0x4bb080._0x1d342e)+'K'](_0x5d39c6,_0x582526);});}else{const _0xed321d={};_0xed321d[_0x1340ae(_0xf7f94d._0x46ad97)+_0x4fc1ac(_0xf7f94d._0x4d3008,_0xf7f94d._0x1b0af9)]=0xbb8;const _0x18261a=await _0x2f71c6[_0x4fc1ac(_0xf7f94d._0x1e481b,_0xf7f94d._0x52042f)+'k'](httpFetch,URL_CONFIG[_0xa157c2(_0xf7f94d._0x2d0dbd)+_0x33ce9f(_0xf7f94d._0x304f5c)+_0x33ce9f(_0xf7f94d._0x462cb6)],_0xed321d);if(_0x2f71c6[_0x4fc1ac(_0xf7f94d._0x3037a1,_0xf7f94d._0x2d3dcb)+'m'](_0x18261a[_0xa00edd(_0xf7f94d._0x2b55f6,_0xf7f94d._0x535d15)+_0xa157c2(_0xf7f94d._0x1e50ca)+'de'],-0xc6*0x2+-0x17d9+-0x1a2d*-0x1))return null;const _0x4e8455=_0x18261a[_0x2d5971(_0xf7f94d._0x1b2261,_0xf7f94d._0x5b65bb)];if(!_0x4e8455?.[_0x43b9d3(_0xf7f94d._0x4d05c6,_0xf7f94d._0x52042f)+_0x1340ae(_0xf7f94d._0x195ace)])return null;if(_0x2f71c6[_0x37082f(_0xf7f94d._0x6b4456)+'r'](_0x2f71c6[_0x1340ae(_0xf7f94d._0xb577ce)+'k'](compareVersions,SCRIPT_VERSION,_0x4e8455[_0x33ce9f(_0xf7f94d._0x2d0dbd)+_0x43b9d3(_0xf7f94d._0x1dface,_0xf7f94d._0x18212b)]),-0x1b5a+0xc33+0xf27)){if(_0x2f71c6[_0xa157c2(_0xf7f94d._0x4f7f12)+'m'](_0x2f71c6[_0xa157c2(_0xf7f94d._0x184a43)+'g'],_0x2f71c6[_0x37082f(_0xf7f94d._0x2c9a24)+'j'])){const _0x4b2e44={};return _0x4b2e44[_0x37082f(_0xf7f94d._0x192b0f)+_0x37082f(_0xf7f94d._0x49adf8)]=_0x4e8455[_0x37082f(_0xf7f94d._0x192b0f)+_0xa00edd(_0xf7f94d._0xc190d3,_0xf7f94d._0x2fe134)],_0x4b2e44[_0x4fc1ac(_0xf7f94d._0x1337c3,_0xf7f94d._0x54f0fb)+_0x4fc1ac(_0xf7f94d._0x5db30f,_0xf7f94d._0x356906)+'l']=_0x4e8455[_0x37082f(_0xf7f94d._0x4b52c4)+_0xa00edd(_0xf7f94d._0x535a4d,_0xf7f94d._0x2ef3cb)+'l'],_0x4b2e44[_0x4fc1ac(_0xf7f94d._0x3e62bd,_0xf7f94d._0x3e4b54)+_0x4fc1ac(_0xf7f94d._0x275dfe,_0xf7f94d._0x4d3834)+_0xa157c2(_0xf7f94d._0x195ace)]=_0x4e8455[_0x1340ae(_0xf7f94d._0x1a67ee)+_0x43b9d3(_0xf7f94d._0x1b9c06,_0xf7f94d._0x2e827e)+_0x2d5971(_0xf7f94d._0xafa243,_0xf7f94d._0x37b531)]||'',_0x4b2e44;}else _0x38758d=_0x43b08c[_0x43b9d3(_0xf7f94d._0x35340d,_0xf7f94d._0x356906)]||_0x2ae8c9[_0x2d5971(_0xf7f94d._0x484a03,_0xf7f94d._0x146302)+_0x37082f(_0xf7f94d._0x594da3)]||_0x519fe9['id']||'';}return null;}}catch(_0x45a0ce){if(_0x2f71c6[_0x43b9d3(_0xf7f94d._0x278c10,_0xf7f94d._0x16ed10)+'h'](_0x2f71c6[_0x33ce9f(_0xf7f94d._0x87cd9c)+'S'],_0x2f71c6[_0x4fc1ac(_0xf7f94d._0x2e653e,_0xf7f94d._0x3288cc)+'B']))return console[_0x4fc1ac(_0xf7f94d._0xf4d589,_0xf7f94d._0x55ac58)](_0x2f71c6[_0x2d5971(_0xf7f94d._0x2552e0,_0xf7f94d._0x30248b)+'O'],_0x45a0ce),null;else throw new _0x473a52(_0x2aa9fc[_0x2d5971(_0xf7f94d._0x165305,_0xf7f94d._0x54f0fb)+_0x43b9d3(_0xf7f94d._0x2b586e,_0xf7f94d._0x395c43)]||AQCbRY[_0xa00edd(_0xf7f94d._0x4fcbad,_0xf7f94d._0x4079cf)+'p']);}}on(EVENT_NAMES[_0x13a569(0x298)+_0x3a325a('0x2ef','pnlU')],async({action:_0x3ea62,source:_0x344bbf,info:_0x8a18cd})=>{const _0x925a60={_0x23172f:'0x24e',_0x4ced2e:0x26a,_0x2fba2a:0x279,_0x1db108:'0x222',_0x35c4a9:'0x29f',_0x25f0a5:'x%sI',_0xcd0302:'0x1f8',_0x5906c5:0x27f,_0x2a1711:0x1d8,_0xe15639:'oXG2',_0x2c7dd2:'0x280',_0x2dfadf:0x1ce,_0x2afe5b:0x21b,_0x582ada:'pnlU',_0x485d73:'0x287',_0x32f1c5:0x1ee,_0x2944c2:'@u#$',_0x13b297:0x215,_0x4f6868:'0x297',_0x40e57c:0x29e,_0x1a240a:'K@Lq',_0x555f13:0x2bf,_0x29202f:'YUFQ',_0x370eaf:0x1b6,_0xaebe53:'9RqC',_0x3878b7:'0x30b',_0x3db776:'pnlU',_0x1eec54:0x2d5,_0x542201:'qrN7',_0x1a1a55:0x2eb,_0x1071a3:'4gsh',_0x4f68b6:'0x2ab',_0x349b57:0x306,_0x30bd36:0x226,_0x5a8790:'@%^s',_0x14a8fa:0x257,_0xcf4fc1:0x1fc,_0xe403f8:'a1@i',_0xa81019:'0x257',_0xfe9574:'0x24d',_0x2fb6f5:'0x286',_0x24c830:0x224,_0x384b5f:'%RgA',_0x53718c:0x244,_0x126b24:'0x306',_0x5698f6:'0x23a',_0x1544d4:'#HOj',_0x239780:'0x241'},_0x4e2ed3=_0x35a8b7,_0x2f5d56=_0x35a8b7,_0x4b5573=_0x35a8b7,_0x2ee5fc=_0x35a8b7,_0x11eae6=_0x16c72a,_0x552ce0=_0x16c72a,_0x82d052=_0x16c72a,_0x3dcf7a=_0x16c72a,_0x1a4bec={'wqGNw':function(_0x287d39,_0x1b342b,_0x26e76d){return _0x287d39(_0x1b342b,_0x26e76d);},'JaUOa':_0x11eae6(_0x925a60._0x23172f)+_0x552ce0(_0x925a60._0x4ced2e)+_0x552ce0(_0x925a60._0x2fba2a),'qvWKf':_0x11eae6(_0x925a60._0x1db108)+_0x4e2ed3(_0x925a60._0x35c4a9,_0x925a60._0x25f0a5),'ToPNc':function(_0x1c4170,_0x1507f8){return _0x1c4170===_0x1507f8;},'wTeqd':_0x82d052(_0x925a60._0xcd0302)+'P','AoCop':function(_0x444ae9,_0x49713d,_0x45c7d4,_0x463216){return _0x444ae9(_0x49713d,_0x45c7d4,_0x463216);}};if(!QUALITY_MAP[_0x344bbf])throw new Error(_0x82d052(_0x925a60._0x5906c5)+'源:'+_0x344bbf);const _0x297aa1=_0x8a18cd[_0x4e2ed3(_0x925a60._0x2a1711,_0x925a60._0xe15639)+_0x3dcf7a(_0x925a60._0x2c7dd2)+'o'];switch(_0x3ea62){case _0x1a4bec[_0x82d052(_0x925a60._0x2dfadf)+'f']:{if(_0x1a4bec[_0x4b5573(_0x925a60._0x2afe5b,_0x925a60._0x582ada)+'c'](_0x1a4bec[_0x11eae6(_0x925a60._0x485d73)+'d'],_0x1a4bec[_0x2ee5fc(_0x925a60._0x32f1c5,_0x925a60._0x2944c2)+'d'])){const _0x58320e=_0x8a18cd[_0x552ce0(_0x925a60._0x13b297)],_0x5cecff=QUALITY_MAP[_0x344bbf][_0x58320e],_0x13a47f=await _0x1a4bec[_0x3dcf7a(_0x925a60._0x4f6868)+'p'](getMusicSourceUrl,_0x344bbf,_0x297aa1,_0x5cecff);return _0x13a47f;}else{const _0x5e0168=_0x4e2ed3(_0x925a60._0x40e57c,_0x925a60._0x1a240a)+'本\\x20'+_0x15941f[_0x2f5d56(_0x925a60._0x555f13,_0x925a60._0x29202f)+_0x4e2ed3(_0x925a60._0x370eaf,_0x925a60._0xaebe53)]+'\\x0a'+(_0x40ae81[_0x4b5573(_0x925a60._0x3878b7,_0x925a60._0x3db776)+_0x2f5d56(_0x925a60._0x1eec54,_0x925a60._0x542201)+_0x2ee5fc(_0x925a60._0x1a1a55,_0x925a60._0x1071a3)]||'')+(_0x11eae6(_0x925a60._0x4f68b6)+'音源'),_0x3aed16={};_0x3aed16[_0x3dcf7a(_0x925a60._0x349b57)]=_0x5e0168,_0x3aed16[_0x4b5573(_0x925a60._0x30bd36,_0x925a60._0x5a8790)+_0x82d052(_0x925a60._0x14a8fa)+'l']=_0x4eb6e2[_0x2f5d56(_0x925a60._0xcf4fc1,_0x925a60._0xe403f8)+_0x552ce0(_0x925a60._0xa81019)+'l'],_0x1a4bec[_0x82d052(_0x925a60._0xfe9574)+'w'](_0x6669b9,_0xd567dd[_0x552ce0(_0x925a60._0x2fb6f5)+_0x4b5573(_0x925a60._0x24c830,_0x925a60._0x384b5f)+_0x3dcf7a(_0x925a60._0x53718c)],_0x3aed16),_0x9432b4[_0x3dcf7a(_0x925a60._0x126b24)](_0x1a4bec[_0x2ee5fc(_0x925a60._0x5698f6,_0x925a60._0x1544d4)+'a'],_0x14179d);return;}}default:throw new Error(_0x552ce0(_0x925a60._0x239780)+'作:'+_0x3ea62);}}),((async()=>{const _0x15be85={_0x186238:'0x1b7',_0x3d267f:0x222,_0x3f04d8:0x2c2,_0x323514:'EC3C',_0x1fe35c:0x22a,_0x35e1d7:'D]Vg',_0x61dabc:0x1c3,_0x56c700:'0x26d',_0x52b19b:'H(5t',_0x41465f:0x24e,_0x10310c:'0x26a',_0x3231cb:'0x2f4',_0x1e93d5:'WUme',_0x50f97e:'0x273',_0x3ba46b:'0x30a',_0x55d4de:'$i5n',_0x178ed1:0x1a8,_0xa95fb6:'&oc*',_0x5bf669:'0x1c7',_0x1cb42a:'0x255',_0x2b85ac:'9RqC',_0xcf73db:0x2ed,_0x199018:'0x2c6',_0x241c90:0x22b,_0x144571:'0x1d9',_0x1cb1bb:'0x2a9',_0x14443d:'0x296',_0x4e867e:']%FK',_0x63d8c7:0x23f,_0x56c7ac:'0x2ca',_0x578281:'0x294',_0x25dff3:0x265,_0x1237d4:'tfNn',_0x2983db:'0x1bd',_0x363a36:0x231,_0x11958a:'[*CH',_0x4d45cf:0x302,_0x1fea83:'0x277',_0x32a13c:0x2b3,_0x1665de:'#HOj',_0x55c989:0x1ae,_0x4781e4:'#2r5',_0x3f195a:0x309,_0x421d5b:'6K^#',_0x622c7f:'0x303',_0x44bd12:0x2fa,_0x47eb78:']%FK',_0x19f85c:'0x1d6',_0xd7dbf6:0x2b5,_0x86bfd7:'VbBm',_0x443741:'0x1fd',_0x266727:'OBhl',_0x50f76a:'0x2ab',_0x2524ca:'0x2f5',_0x15a765:'0x286',_0x14e25c:0x257,_0x6aef73:0x1ca,_0x367c5a:'a1@i',_0x5c9062:'0x236',_0x2a58bf:'F$*O',_0xd4649d:0x20e,_0x173c04:'qT0F',_0x7d5802:'0x28e',_0xb919bf:'0spJ',_0x11e2ca:0x2a7,_0x11ae2d:'ckwF',_0x25ddfd:'0x2d7',_0x9a58ef:'0x210',_0x35ea97:0x1d1,_0x3d02be:'0x274',_0x23da29:0x311,_0x4a82c8:0x1d3,_0xe3ed53:'x]b[',_0x414f5c:'0x1e3',_0x25ba78:'@%^s',_0xd99ad1:0x308,_0x301714:0x235,_0x4235ad:'XR$D',_0xc38712:0x272,_0x16649a:'x%sI',_0x34d3a5:'0x2b2'},_0x3161d6={_0x18b834:0x1c9,_0x332399:'qT0F',_0x5d9900:'0x2fe',_0x2d4cd5:0x2e4,_0x24268c:'@%^s',_0x49c0f:0x1be,_0x2a0034:'z58f',_0x1ecec5:'0x229',_0x18a15c:0x20b,_0x46d1ca:0x239,_0x412826:'qrN7'},_0x2ba240=_0x217cc4,_0x3cd223=_0x217cc4,_0x228fa4=_0x217cc4,_0x4f662f=_0x217cc4,_0x40f621=_0x2ee0ad,_0x3847b1=_0x2ee0ad,_0xf6f67f=_0x2ee0ad,_0xfc2c65=_0x2ee0ad,_0x2c6e86={'MRdrv':function(_0x3a55d2,_0x1d898f){return _0x3a55d2<_0x1d898f;},'yTbOs':function(_0x30176d,_0x42bf4e){return _0x30176d>_0x42bf4e;},'UldDj':function(_0x46c427,_0x118d78){return _0x46c427===_0x118d78;},'nZTwK':_0x40f621(_0x15be85._0x186238)+'R','QRZhO':_0x3847b1(_0x15be85._0x3d267f)+'c','fQcdD':_0x2ba240(_0x15be85._0x3f04d8,_0x15be85._0x323514)+_0x2ba240(_0x15be85._0x1fe35c,_0x15be85._0x35e1d7),'GthiH':function(_0x38b61c){return _0x38b61c();},'wHSNv':function(_0x87942d,_0x557061){return _0x87942d===_0x557061;},'cUNcn':_0x3847b1(_0x15be85._0x61dabc)+'N','rHmlB':_0x2ba240(_0x15be85._0x56c700,_0x15be85._0x52b19b)+'o','USoOZ':function(_0x4a2da0,_0x2006ac,_0x3fd2f3){return _0x4a2da0(_0x2006ac,_0x3fd2f3);},'EJxah':_0x3847b1(_0x15be85._0x41465f)+_0xfc2c65(_0x15be85._0x10310c)+_0x2ba240(_0x15be85._0x3231cb,_0x15be85._0x1e93d5),'KiUEy':function(_0x16b5d1,_0x1aeed5,_0x1d7c16){return _0x16b5d1(_0x1aeed5,_0x1d7c16);},'KVZtB':_0x3847b1(_0x15be85._0x50f97e)+_0x4f662f(_0x15be85._0x3ba46b,_0x15be85._0x55d4de)+_0x228fa4(_0x15be85._0x178ed1,_0x15be85._0xa95fb6)+_0x40f621(_0x15be85._0x5bf669)+_0x2ba240(_0x15be85._0x1cb42a,_0x15be85._0x2b85ac)},_0x4587b3=await _0x2c6e86[_0x40f621(_0x15be85._0xcf73db)+'H'](checkUpdate);if(_0x4587b3){if(_0x2c6e86[_0xfc2c65(_0x15be85._0x199018)+'v'](_0x2c6e86[_0x4f662f(_0x15be85._0x241c90,_0x15be85._0x52b19b)+'n'],_0x2c6e86[_0x3847b1(_0x15be85._0x144571)+'B'])){const _0xf970bd=_0x328fb9[_0x40f621(_0x15be85._0x1cb1bb)+_0x4f662f(_0x15be85._0x14443d,_0x15be85._0x4e867e)](/^v/,'')[_0x3847b1(_0x15be85._0x63d8c7)+'t']('.')[_0xfc2c65(_0x15be85._0x56c7ac)](_0x209f7f),_0x18f146=_0x3ad8ed[_0xf6f67f(_0x15be85._0x1cb1bb)+_0x3847b1(_0x15be85._0x578281)](/^v/,'')[_0x3cd223(_0x15be85._0x25dff3,_0x15be85._0x1237d4)](_0x19d822),_0x4422ff=_0x501685[_0x40f621(_0x15be85._0x2983db)](_0xf970bd[_0x2ba240(_0x15be85._0x363a36,_0x15be85._0x11958a)+'th'],_0x18f146[_0x40f621(_0x15be85._0x4d45cf)+'th']);for(let _0x1cd81c=-0x83b+0xf53+-0x1*0x718;nETKIm[_0x228fa4(_0x15be85._0x1fea83,_0x15be85._0x1237d4)+'v'](_0x1cd81c,_0x4422ff);_0x1cd81c++){const _0x552fa6=_0xf970bd[_0x1cd81c]||-0xc7d*-0x1+0x42d*0x1+-0x855*0x2,_0x25f7fb=_0x18f146[_0x1cd81c]||0xc5c+0x1*0x215e+-0x2dba;if(nETKIm[_0x228fa4(_0x15be85._0x32a13c,_0x15be85._0x1665de)+'s'](_0x552fa6,_0x25f7fb))return-0x21c7+0x8e*-0x1+-0x36f*-0xa;if(nETKIm[_0x3cd223(_0x15be85._0x55c989,_0x15be85._0x4781e4)+'v'](_0x552fa6,_0x25f7fb))return-(0x10d7+0x268c+-0x6*0x93b);}return-0x709+-0x9e*0x39+-0x2a37*-0x1;}else{const _0x948013=_0x4f662f(_0x15be85._0x3f195a,_0x15be85._0x421d5b)+'本\\x20'+_0x4587b3[_0xf6f67f(_0x15be85._0x622c7f)+_0x4f662f(_0x15be85._0x44bd12,_0x15be85._0x47eb78)]+'\\x0a'+(_0x4587b3[_0x40f621(_0x15be85._0x19f85c)+_0x228fa4(_0x15be85._0xd7dbf6,_0x15be85._0x86bfd7)+_0x228fa4(_0x15be85._0x443741,_0x15be85._0x266727)]||'')+(_0xfc2c65(_0x15be85._0x50f76a)+'音源'),_0xa1b9f0={};_0xa1b9f0[_0x2ba240(_0x15be85._0x2524ca,_0x15be85._0x52b19b)]=_0x948013,_0xa1b9f0[_0x3847b1(_0x15be85._0x15a765)+_0xf6f67f(_0x15be85._0x14e25c)+'l']=_0x4587b3[_0xf6f67f(_0x15be85._0x15a765)+_0xfc2c65(_0x15be85._0x14e25c)+'l'],_0x2c6e86[_0x2ba240(_0x15be85._0x6aef73,_0x15be85._0x367c5a)+'Z'](send,EVENT_NAMES[_0x4f662f(_0x15be85._0x5c9062,_0x15be85._0x2a58bf)+_0x2ba240(_0x15be85._0xd4649d,_0x15be85._0x173c04)+_0x228fa4(_0x15be85._0x7d5802,_0x15be85._0xb919bf)],_0xa1b9f0),console[_0x2ba240(_0x15be85._0x11e2ca,_0x15be85._0x11ae2d)](_0x2c6e86[_0xfc2c65(_0x15be85._0x25ddfd)+'h'],_0x4587b3);return;}}const _0x5097ee={};Object[_0x4f662f(_0x15be85._0x9a58ef,_0x15be85._0x35e1d7)](SOURCE_QUALITY_LIST)[_0xf6f67f(_0x15be85._0x35ea97)+_0x40f621(_0x15be85._0x3d02be)](_0x3a7b2b=>{const _0x4e5c6e=_0xf6f67f,_0x18827c=_0xf6f67f,_0x5cf6f3=_0xf6f67f,_0x370355=_0x4f662f,_0x5d600a=_0x4f662f,_0x1aadb2=_0x4f662f,_0x505029=_0x4f662f;if(_0x2c6e86[_0x370355(_0x3161d6._0x18b834,_0x3161d6._0x332399)+'j'](_0x2c6e86[_0x4e5c6e(_0x3161d6._0x5d9900)+'K'],_0x2c6e86[_0x370355(_0x3161d6._0x2d4cd5,_0x3161d6._0x24268c)+'K']))_0x5097ee[_0x3a7b2b]={'name':PLATFORM_NAME[_0x3a7b2b],'type':_0x2c6e86[_0x370355(_0x3161d6._0x49c0f,_0x3161d6._0x2a0034)+'O'],'actions':[_0x2c6e86[_0x18827c(_0x3161d6._0x1ecec5)+'D']],'qualitys':SOURCE_QUALITY_LIST[_0x3a7b2b]};else{const _0x10a635=_0x5d4aab[_0x2b08f5];if(_0x10a635[_0x5cf6f3(_0x3161d6._0x18a15c)+_0x1aadb2(_0x3161d6._0x46d1ca,_0x3161d6._0x412826)](_0x4dc445))return _0x1c5d06;return _0x10a635[-0x1b32+0x15*-0xa1+-0x1*-0x2867];}});const _0x478fa1={};_0x478fa1[_0x40f621(_0x15be85._0x23da29)+'us']=!![],_0x478fa1[_0x3cd223(_0x15be85._0x4a82c8,_0x15be85._0xe3ed53)+_0x2ba240(_0x15be85._0x414f5c,_0x15be85._0x25ba78)]=_0x5097ee,_0x2c6e86[_0x3847b1(_0x15be85._0xd99ad1)+'y'](send,EVENT_NAMES[_0x228fa4(_0x15be85._0x301714,_0x15be85._0x4235ad)+'ed'],_0x478fa1),console[_0x4f662f(_0x15be85._0xc38712,_0x15be85._0x16649a)](_0x2c6e86[_0x40f621(_0x15be85._0x34d3a5)+'B']);})());`}],(function(J){"use strict";var U="/api/proxy";function q(o,s){if(!/^https?:\/\//i.test(o))return o;var a=U.indexOf("?")>-1?"&":"?";return U+a+"url="+encodeURIComponent(o)+"&kind="+(s||"api")+"&_t="+Date.now()}var D={"User-Agent":"Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36"};function K(o){return Object.keys(o).filter(function(s){return o[s]!=null}).map(function(s){return encodeURIComponent(s)+"="+encodeURIComponent(String(o[s]))}).join("&")}function S(o){if(o.formData){var s=new FormData;return Object.keys(o.formData).forEach(function(a){var c=o.formData[a];c!=null&&s.append(a,c instanceof Blob?c:String(c))}),{body:s}}return o.form?{body:K(o.form),contentType:"application/x-www-form-urlencoded"}:o.body!=null?typeof o.body=="string"?{body:o.body}:{body:JSON.stringify(o.body),contentType:"application/json"}:{}}function Q(o){var s={};return o.forEach(function(a,c){var d=c.toLowerCase();d==="set-cookie"?s[d]=a.split(/,\s*(?=[^;=]+=)/):s[d]=a}),!s["set-cookie"]&&s["x-set-cookie"]&&(s["set-cookie"]=String(s["x-set-cookie"]).split(`
`),delete s["x-set-cookie"]),s}function E(o,s){if(s==="text"||s==="script")return o;try{return JSON.parse(o)}catch{return o}}function B(o,s,a,c){var d=new AbortController,x=a.timeout==null?9e3:a.timeout,_=null,v=!1,I=!1,f=function(){v=!0,d.abort()},b=function(){x>0&&(_=setTimeout(function(){I=!0,v=!0,d.abort()},x));var k={},L=Object.assign({},D,a.headers||{});Object.keys(L).forEach(function(N){L[N]!=null&&(k[N]=String(L[N]))});var T=S(a);return T.contentType&&!Object.keys(k).some(function(N){return N.toLowerCase()==="content-type"})&&(k["Content-Type"]=T.contentType),fetch(q(o,a.kind),{method:(s||"get").toUpperCase(),headers:k,body:T.body,signal:d.signal,credentials:"omit",redirect:"follow",cache:"no-store"}).then(function(N){return a.responseType==="arraybuffer"?N.arrayBuffer().then(function(F){return{statusCode:N.status,statusMessage:N.statusText,headers:Q(N.headers),body:null,raw:new Uint8Array(F)}}):N.text().then(function(F){return{statusCode:N.status,statusMessage:N.statusText,headers:Q(N.headers),body:E(F,a.format),raw:F}})})},y=!1,h=function(k,L,T){if(!y){y=!0;try{c(k,L,T)}catch{}}},i=b().then(function(k){if(_&&clearTimeout(_),v&&!k)throw new Error("cancel request");return h(null,k,k.body),k}).catch(function(k){_&&clearTimeout(_);var L=k&&k.message||String(k),T="ENETWORK";I?(L="请求超时",T="ETIMEDOUT"):v?(L="cancel request",T="ECANCELED"):k&&k.name==="AbortError"?(L="请求超时",T="ETIMEDOUT"):/Failed to fetch|NetworkError|Load failed/i.test(L)&&(L="无法连接到服务器");var N=new Error(L);throw N.code=T,h(N),N});return i.catch(function(){}),{promise:i,cancel:f}}function C(o,s){s=s||{method:"get"};var a={isCancelled:!1,promise:null,cancelHttp:null,requestObj:null};return a.cancelHttp=function(){if(!a.requestObj){a.isCancelled=!0;return}a.requestObj.cancel(),a.requestObj=null},a.promise=new Promise(function(c,d){a.requestObj=B(o,s.method||"get",s,function(x,_){if(a.requestObj=null,x)return d(x);c(_)}),a.isCancelled&&a.cancelHttp()}),a}function g(o,s,a){return typeof s=="function"&&(a=s,s={}),B(o,"get",s||{},a)}function m(o,s,a,c){return typeof a=="function"&&(c=a,a={}),a=a||{},s!=null&&a.body==null&&a.form==null&&(a.body=s),B(o,"post",a,c)}J.LxRequest={httpFetch:C,httpGet:g,httpPost:m,fetchData:B}})(window),(function(J){"use strict";function U(g){return g<10?"0"+g:String(g)}function q(g){var m=Math.trunc(g/60),o=Math.trunc(g%60);return m===0&&o===0?"--/--":U(m)+":"+U(o)}function D(g){if(!g||!isFinite(g)||g<0)return"0 B";var m=["B","KiB","MiB","GiB","TiB"],o=Math.floor(Math.log(g)/Math.log(1024));return(g/Math.pow(1024,Math.floor(o))).toFixed(2)+" "+m[o]}function K(g){return g?new window.DOMParser().parseFromString(String(g),"text/html").body.textContent:""}function S(g,m,o){if(m=m||"name",o=o||"、",Array.isArray(g)){var s=[];return g.forEach(function(a){var c=a&&a[m];c&&s.push(c)}),K(s.join(o))}return K(String(g??""))}var Q=[7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21],E=null;function B(){if(E)return E;E=[];for(var g=0;g<64;g++)E[g]=Math.floor(Math.abs(Math.sin(g+1))*4294967296)|0;return E}function C(g){var m=new TextEncoder().encode(g),o=Q,s=B(),a=m.length*8,c=new Uint8Array((m.length+8>>6)+1<<6);c.set(m),c[m.length]=128;var d=new DataView(c.buffer);d.setUint32(c.length-8,a>>>0,!0),d.setUint32(c.length-4,Math.floor(a/4294967296),!0);for(var x=1732584193,_=4023233417,v=2562383102,I=271733878,f=new Array(16),b=0;b<c.length;b+=64){for(var y=0;y<16;y++)f[y]=d.getUint32(b+y*4,!0);for(var h=x,i=_,k=v,L=I,T=0;T<64;T++){var N,F;T<16?(N=i&k|~i&L,F=T):T<32?(N=L&i|~L&k,F=(5*T+1)%16):T<48?(N=i^k^L,F=(3*T+5)%16):(N=k^(i|~L),F=7*T%16),N=N+h+s[T]+f[F]|0,h=L,L=k,k=i,i=i+(N<<o[T]|N>>>32-o[T])|0}x=x+h|0,_=_+i|0,v=v+k|0,I=I+L|0}var W=function(an){for(var on="",V=0;V<4;V++)on+=(an>>>V*8&255).toString(16).padStart(2,"0");return on};return W(x)+W(_)+W(v)+W(I)}J.LxUtils={numFix:U,formatPlayTime:q,sizeFormate:D,decodeName:K,formatSingerName:S,toMD5:C}})(window),(function(J){"use strict";var U=new Uint8Array(256),q=new Uint8Array(256),D=[1,2,4,8,16,32,64,128,27,54];(function(){var o=1,s=1;do{o=(o^o<<1^(o&128?27:0))&255,s^=s<<1,s^=s<<2,s^=s<<4,s&=255,s&128&&(s^=9);var a=s^(s<<1|s>>7)^(s<<2|s>>6)^(s<<3|s>>5)^(s<<4|s>>4);U[o]=(a^99)&255}while(o!==1);U[0]=99;for(var c=0;c<256;c++)q[U[c]]=c})();function K(m){return(m<<1^(m&128?27:0))&255}function S(m,o){for(var s=0;o;)o&1&&(s^=m),m=K(m),o>>=1;return s&255}function Q(m){for(var o=m.length/4,s=o+6,a=[],c=0;c<o;c++)a[c]=[m[4*c],m[4*c+1],m[4*c+2],m[4*c+3]];for(var d=o;d<4*(s+1);d++){var x=a[d-1].slice();d%o===0?(x.push(x.shift()),x=x.map(function(_){return U[_]}),x[0]^=D[d/o-1]):o>6&&d%o===4&&(x=x.map(function(_){return U[_]})),a[d]=a[d-o].map(function(_,v){return _^x[v]})}return{w:a,Nr:s}}function E(m,o){for(var s=[[],[],[],[]],a=0;a<4;a++)for(var c=0;c<4;c++)s[c][a]=m[a*4+c];function d(h){for(var i=0;i<4;i++)for(var k=o.w[h*4+i],L=0;L<4;L++)s[L][i]^=k[L]}function x(){for(var h=0;h<4;h++)for(var i=0;i<4;i++)s[h][i]=U[s[h][i]]}function _(){for(var h=1;h<4;h++)s[h]=s[h].slice(h).concat(s[h].slice(0,h))}function v(){for(var h=0;h<4;h++){var i=s[0][h],k=s[1][h],L=s[2][h],T=s[3][h];s[0][h]=S(i,2)^S(k,3)^L^T,s[1][h]=i^S(k,2)^S(L,3)^T,s[2][h]=i^k^S(L,2)^S(T,3),s[3][h]=S(i,3)^k^L^S(T,2)}}d(0);for(var I=1;I<o.Nr;I++)x(),_(),v(),d(I);x(),_(),d(o.Nr);for(var f=new Uint8Array(16),b=0;b<4;b++)for(var y=0;y<4;y++)f[b*4+y]=s[y][b];return f}function B(m){return m instanceof Uint8Array?m:m instanceof ArrayBuffer?new Uint8Array(m):new TextEncoder().encode(String(m))}function C(m,o){var s=B(m),a=B(o),c=Q(a),d=16-s.length%16,x=new Uint8Array(s.length+d);x.set(s);for(var _=0;_<d;_++)x[s.length+_]=d;for(var v=new Uint8Array(x.length),I=0;I<x.length;I+=16)v.set(E(x.slice(I,I+16),c),I);return v}function g(m){for(var o="",s=0;s<m.length;s++)o+=m[s].toString(16).padStart(2,"0");return o.toUpperCase()}J.LxAes={encryptEcb:C,toHexUpper:g}})(window),(function(J){"use strict";var U=J.LxRequest,q=J.LxUtils,D=/level:(\w+),bitrate:(\d+),format:(\w+),size:([\w.]+)/;function K(E){return String(E||"").replace(/&/g,"、")}function S(E){var B=[];if(!E)return B;for(var C=0;C<E.length;C++){var g=E[C],m=String(g.MUSICRID||"").replace("MUSIC_","");if(g.N_MINFO){for(var o=[],s={},a=g.N_MINFO.split(";"),c=0;c<a.length;c++){var d=a[c].match(D);if(d){var x=d[4];switch(d[2]){case"4000":o.push({type:"flac24bit",size:x}),s.flac24bit={size:x.toLocaleUpperCase()};break;case"2000":o.push({type:"flac",size:x}),s.flac={size:x.toLocaleUpperCase()};break;case"320":o.push({type:"320k",size:x}),s["320k"]={size:x.toLocaleUpperCase()};break;case"128":o.push({type:"128k",size:x}),s["128k"]={size:x.toLocaleUpperCase()};break}}}o.reverse();var _=parseInt(g.DURATION,10);B.push({name:q.decodeName(g.SONGNAME),singer:K(q.decodeName(g.ARTIST)),source:"kw",songmid:m,albumId:q.decodeName(g.ALBUMID||""),interval:isNaN(_)?0:q.formatPlayTime(_),albumName:g.ALBUM?q.decodeName(g.ALBUM):"",lrc:null,img:null,types:o,_types:s})}}return B}function Q(E,B,C,g){if(B=B||1,C=C||30,g=g||0,g>0)return Promise.reject(new Error("酷我搜索失败"));var m="http://search.kuwo.cn/r.s?client=kt&all="+encodeURIComponent(E)+"&pn="+(B-1)+"&rn="+C+"&uid=794762570&ver=kwplayer_ar_9.2.2.1&vipver=1&show_copyright_off=1&newver=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1&issubtitle=1";return U.httpFetch(m).promise.then(function(o){var s=o.body;if(!s||s.TOTAL!=="0"&&s.SHOW==="0")return Q(E,B,C,g+1);var a=S(s.abslist);if(a==null)return Q(E,B,C,g+1);var c=parseInt(s.TOTAL,10)||0;return{list:a,allPage:Math.ceil(c/C),total:c,limit:C,source:"kw"}})}J.LxSourceKw={id:"kw",name:"酷我",search:Q}})(window),(function(J){"use strict";var U=J.LxRequest,q=J.LxUtils;function D(Q){var E=[],B={};function C(g,m,o){var s=Q[m],a=Q[o];if(!(!s||!a)){var c=q.sizeFormate(s);E.push({type:g,size:c,hash:a}),B[g]={size:c,hash:a}}}return C("128k","FileSize","FileHash"),C("320k","HQFileSize","HQFileHash"),C("flac","SQFileSize","SQFileHash"),C("flac24bit","ResFileSize","ResFileHash"),{singer:q.decodeName(q.formatSingerName(Q.Singers,"name")),name:q.decodeName(Q.OriSongName+(Q.Suffix?" "+Q.Suffix:"")),albumName:q.decodeName(Q.AlbumName),albumId:Q.AlbumID,songmid:Q.Audioid,albumAudioId:Q.MixSongID,source:"kg",interval:q.formatPlayTime(Q.Duration),_interval:Q.Duration,img:null,lrc:null,hash:Q.FileHash,types:E,_types:B}}function K(Q){var E={},B=[];return Q.forEach(function(C){var g=C.Audioid+C.FileHash;E[g]||(E[g]=!0,B.push(D(C)),(C.Grp||[]).forEach(function(m){var o=m.Audioid+m.FileHash;E[o]||(E[o]=!0,B.push(D(m)))}))}),B}function S(Q,E,B,C){if(C=C||0,E=E||1,B=B||30,++C>1)return Promise.reject(new Error("酷狗搜索失败"));var g="http://songsearch.kugou.com/song_search_v2?platform=AndroidFilter&iscorrection=1&keyword="+encodeURIComponent(Q)+"&hifiquality=0&pagesize="+B+"&PrivilegeFilter=0&page="+E;return U.httpFetch(g).promise.then(function(m){var o=m.body;if(!o||o.error_code!==0)return S(Q,E,B,C);var s=K(o.data.lists||[]);if(!s)return S(Q,E,B,C);var a=o.data.total;return{list:s,allPage:Math.ceil(a/B),limit:B,total:a,source:"kg"}})}J.LxSourceKg={id:"kg",name:"酷狗",search:S}})(window),(function(J){"use strict";var U=J.LxRequest,q=J.LxUtils,D=[23,14,6,36,16,40,7,19],K=[16,1,32,12,19,27,8,5],S=[89,39,179,150,218,82,58,252,177,52,186,123,120,64,242,133,143,161,121,179];function Q(a){var c=new TextEncoder().encode(a),d=c.length*8,x=new Uint8Array((c.length+8>>6)+1<<6);x.set(c),x[c.length]=128;var _=new DataView(x.buffer);_.setUint32(x.length-8,Math.floor(d/4294967296),!1),_.setUint32(x.length-4,d>>>0,!1);var v=1732584193,I=4023233417,f=2562383102,b=271733878,y=3285377520;function h($,gn){return($<<gn|$>>>32-gn)>>>0}for(var i=new Uint32Array(80),k=0;k<x.length;k+=64){for(var L=0;L<16;L++)i[L]=_.getUint32(k+L*4,!1);for(var T=16;T<80;T++)i[T]=h(i[T-3]^i[T-8]^i[T-14]^i[T-16],1);for(var N=v,F=I,W=f,an=b,on=y,V=0;V<80;V++){var un,hn;V<20?(un=F&W|~F&an,hn=1518500249):V<40?(un=F^W^an,hn=1859775393):V<60?(un=F&W|F&an|W&an,hn=2400959708):(un=F^W^an,hn=3395469782);var ln=h(N,5)+un+on+hn+i[V]>>>0;on=an,an=W,W=h(F,30),F=N,N=ln}v=v+N>>>0,I=I+F>>>0,f=f+W>>>0,b=b+an>>>0,y=y+on>>>0}return[v,I,f,b,y].map(function($){return $.toString(16).padStart(8,"0")}).join("")}function E(a,c){return c.map(function(d){return a[d]}).join("")}function B(a){for(var c="",d=0;d<a.length;d++)c+=String.fromCharCode(a[d]);return btoa(c).replace(/[\\/+=]/g,"")}function C(a){var c=Q(a);return(function(){var d=E(c,D),x=E(c,K),_=S.map(function(I,f){return I^parseInt(c.slice(f*2,f*2+2),16)}),v=B(_).replace(/[\\/+=]/g,"");return("zzc"+d+v+x).toLowerCase()})()}function g(){for(var a="",c=0;c<32;c++)a+=Math.floor(Math.random()*16).toString(16);return a.toUpperCase()+String(Math.floor(Math.random()*1e5)).padStart(5,"0")}function m(a){var c=C(JSON.stringify(a));return U.httpFetch("https://u.y.qq.com/cgi-bin/musics.fcg?sign="+c,{method:"post",headers:{"User-Agent":"QQMusic 14090508(android 12)"},body:a}).promise}function o(a){var c=[],d={};if((a.file?.media_mid?[{type:"128k",size:a.file.size_128mp3,mid:a.file.media_mid}]:[]).forEach(function(f){var b=q.sizeFormate(f.size);c.push({type:f.type,size:b}),d[f.type]={size:b}}),a.file?.size_320mp3){var x=q.sizeFormate(a.file.size_320mp3);c.push({type:"320k",size:x}),d["320k"]={size:x}}if(a.file?.size_flac){var _=q.sizeFormate(a.file.size_flac);c.push({type:"flac",size:_}),d.flac={size:_}}if(a.file?.size_hires){var v=q.sizeFormate(a.file.size_hires);c.push({type:"flac24bit",size:v}),d.flac24bit={size:v}}var I=(a.singer||[]).map(function(f){return{name:f.name}});return{singer:q.decodeName(q.formatSingerName(I)),name:q.decodeName(a.title),albumName:q.decodeName(a.album?.name||""),albumId:a.album?.id,songmid:a.mid,strMediaMid:a.file?.media_mid,source:"tx",interval:q.formatPlayTime(a.interval),img:null,lrc:null,types:c,_types:d}}function s(a,c,d,x){if(c=c||1,d=d||50,x=x||0,x>1)return Promise.reject(new Error("企鹅搜索失败"));var _={comm:{_channelid:"0",_os_version:"6.2.9200-2",ct:"19",cv:"2151",guid:"1F70E520B2EAA7D25E11760783C53CA9",patch:"118",psrf_access_token_expiresAt:0,psrf_qqaccess_token:"",psrf_qqopenid:"",psrf_qqunionid:"",tmeAppID:"qqmusic",tmeLoginType:0,uin:"0",wid:"7223299733393904640"},"music.search.SearchCgiService":{module:"music.search.SearchCgiService",method:"DoSearchForQQMusicDesktop",param:{grp:1,num_per_page:d,page_num:c,query:a,remoteplace:"txt.newclient.top",search_type:0,searchid:g()}}};return m(_).then(function(v){var I=v.body,f=I&&I["music.search.SearchCgiService"]||I&&I.req;if(!f||I.code!==0||f.code!==0)return s(a,c,d,x+1);var b=f.data,y=(b.body?.song?.list||[]).map(o),h=b.meta?.sum||y.length;return{list:y,allPage:Math.ceil(h/d),limit:d,total:h,source:"tx"}})}J.LxSourceTx={id:"tx",name:"企鹅",search:s}})(window),(function(J){"use strict";var U=J.LxRequest,q=J.LxUtils;function D(Q,E){var B="963B7AA0D21511ED807EE5846EC87D20",C="6cdc72a439cef99a3418d2a78aa28c73",g=q.toMD5(E+C+"yyapp2d16148780a1dcc7408e06336b98cfd50"+B+Q);return{sign:g,deviceId:B}}function K(Q){var E=[],B={};return(Q||[]).forEach(function(C){(C||[]).forEach(function(g){if(!(!g.songId||!g.copyrightId||B[g.copyrightId])){B[g.copyrightId]=!0;var m=[],o={};(g.audioFormats||[]).forEach(function(a){var c=q.sizeFormate(a.asize!=null?a.asize:a.isize);switch(a.formatType){case"PQ":m.push({type:"128k",size:c}),o["128k"]={size:c};break;case"HQ":m.push({type:"320k",size:c}),o["320k"]={size:c};break;case"SQ":m.push({type:"flac",size:c}),o.flac={size:c};break;case"ZQ24":m.push({type:"flac24bit",size:c}),o.flac24bit={size:c};break}});var s=g.img3||g.img2||g.img1||null;s&&!/https?:/.test(s)&&(s="http://d.musicapp.migu.cn"+s),E.push({singer:q.formatSingerName(g.singerList),name:g.name,albumName:g.album,albumId:g.albumId,songmid:g.songId,copyrightId:g.copyrightId,source:"mg",interval:q.formatPlayTime(g.duration),img:s,lrc:null,lrcUrl:g.lrcUrl,types:m,_types:o})}})}),E}function S(Q,E,B,C){if(E=E||1,B=B||20,C=C||0,++C>1)return Promise.reject(new Error("咪咕搜索失败"));var g=Date.now().toString(),m=D(g,Q),o=encodeURIComponent('{"song":1,"album":0,"singer":0,"tagSong":1,"mvSong":0,"bestShow":1,"songlist":0,"lyricSong":0}'),s="https://jadeite.migu.cn/music_search/v3/search/searchAll?isCorrect=0&isCopyright=1&searchSwitch="+o+"&pageSize="+B+"&text="+encodeURIComponent(Q)+"&pageNo="+E+"&sort=0&sid=USS";return U.httpFetch(s,{headers:{uiVersion:"A_music_3.6.1",deviceId:m.deviceId,timestamp:g,sign:m.sign,channel:"0146921","User-Agent":"Mozilla/5.0 (Linux; U; Android 11.0.0; zh-cn; MI 11 Build/OPR1.170623.032) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30"}}).promise.then(function(a){var c=a.body;if(!c||c.code!=="000000")return Promise.reject(new Error(c&&c.info||"咪咕搜索失败"));var d=c.songResultData||{resultList:[],totalCount:0},x=K(d.resultList),_=parseInt(d.totalCount,10)||0;return{list:x,allPage:Math.ceil(_/B),limit:B,total:_,source:"mg"}})}J.LxSourceMg={id:"mg",name:"咪咕",search:S}})(window),(function(J){"use strict";var U=J.LxRequest,q=J.LxUtils,D="e82ckenh8dichen8";function K(o){var s=J.LxAes.encryptEcb(o,new TextEncoder().encode(D));return Promise.resolve(J.LxAes.toHexUpper(s))}function S(o,s){var a=typeof s=="object"?JSON.stringify(s):s,c="nobody"+o+"use"+a+"md5forencrypt",d=q.toMD5(c),x=o+"-36cd479b6b5-"+a+"-36cd479b6b5-"+d;return K(x).then(function(_){return{params:_}})}function Q(o,s){return S(o,s).then(function(a){return U.httpFetch("http://interface.music.163.com/eapi/batch",{method:"post",headers:{"User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36",origin:"https://music.163.com"},form:a}).promise})}function E(o,s,a){var c=["/api/search/get","/api/search/get/web"],d=0,x=function(){if(d>=c.length)return Promise.reject(new Error("网易公开搜索接口不可用"));var _="https://music.163.com"+c[d++]+"?s="+encodeURIComponent(o)+"&type=1&limit="+s+"&offset="+a;return U.httpFetch(_,{timeout:9e3,headers:{Referer:"https://music.163.com/","User-Agent":"Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36",Cookie:"appver=2.9.7"}}).promise.then(function(v){var I=v.body;if(I&&I.abroad)throw new Error("abroad");if(!I||I.code!==200||!I.result||!I.result.songs)throw new Error("网易公开搜索返回异常（code "+(I&&I.code)+"）");return I}).catch(function(v){return x()})};return x()}function B(o){return(o||[]).map(function(s){return s.name}).join("、")}function C(o){if(!Array.isArray(o))return[];var s=[];return o.forEach(function(a){if(!(!a||a.id==null)){var c=[],d={},x=function(b){c.push({type:b,size:null}),d[b]={size:null}},_=!1;a.hr&&(x("flac24bit"),_=!0),a.sq&&(x("flac"),_=!0),a.h&&(x("320k"),_=!0),(a.m||a.l)&&(x("128k"),_=!0),_||x("128k");var v=a.ar||a.artists||[],I=a.al||a.album||{},f=a.dt||a.duration||0;s.push({singer:q.decodeName(B(v)),name:q.decodeName(a.name),albumName:q.decodeName(I.name||""),albumId:I.id,songmid:a.id,source:"wy",interval:q.formatPlayTime(Math.floor(f/1e3)),img:I.picUrl||null,lrc:null,types:c,_types:d})}}),s}function g(o,s,a,c){if(s=s||1,a=a||30,c=c||0,c>3)return Promise.reject(new Error("网易搜索重试次数用尽"));var d=a*(s-1);return E(o,a,d).then(function(x){var _=x.body;if(_&&_.code===200&&_.result&&_.result.songs){var v=C(_.result.songs),I=_.result.songCount||v.length;return{list:v,allPage:Math.ceil(I/a),limit:a,total:I,source:"wy"}}return _&&_.code===400?Promise.reject(new Error("网易接口拒绝（可能限流）")):m(o,a,d,c)}).catch(function(x){return m(o,a,d,c).catch(function(){throw x&&x.message?x:new Error("网易搜索失败")})})}function m(o,s,a,c){return Q("/api/search/song/list/page",{keyword:o,needCorrect:"1",channel:"typing",offset:a,scene:"normal",total:a===0,limit:s}).then(function(d){var x=d.body;if(!x||x.code!==200)return x&&(x.code===460||x.code===405)?Promise.reject(new Error("网易接口限流（code "+x.code+"）")):c<3?g(o,Math.floor(a/s)+1,s,c+1):Promise.reject(new Error("网易搜索失败（code "+(x&&x.code)+"）"));var _=x.data||{},v=(_.resources||[]).map(function(b){return b&&b.baseInfo&&b.baseInfo.simpleSongData}).filter(Boolean),I=C(v),f=_.totalCount||I.length;return{list:I,allPage:Math.ceil(f/s),limit:s,total:f,source:"wy"}})}J.LxSourceWy={id:"wy",name:"网易云",search:g}})(window),(function(J){"use strict";var U={},q=["kw","kg","tx","wy","mg"];function D(m){!m||!m.id||(U[m.id]=m)}function K(){return q.filter(function(m){return U[m]}).map(function(m){return{id:m,name:U[m].name}})}function S(m){var o={};return m.filter(function(s){var a=s.songmid||s.hash||s.albumAudioId||s.name+"|"+s.singer,c=s.source+"|"+a;return o[c]?!1:(o[c]=!0,!0)})}function Q(m,o){var s=m.map(function(c,d){return{it:c,i:d,s:E(c,o)}}),a={};return s.forEach(function(c){var d=c.it.source||"";c.n=a[d]||0,a[d]=c.n+1}),s.sort(function(c,d){return d.s-c.s||c.n-d.n||c.i-d.i}),s.map(function(c){return c.it})}function E(m,o){var s=String(m.name||"").toLowerCase(),a=String(o||"").toLowerCase();if(!a)return 0;if(s===a)return 100;if(s.indexOf(a)===0)return 80;if(s.indexOf(a)>-1)return 60;var c=String(m.singer||"").toLowerCase();return c.indexOf(a)>-1?40:10}function B(m,o,s,a){var c=U[m];return c?c.search(o,s,a):Promise.reject(new Error("未知音源: "+m))}function C(m,o,s,a){o=o||1,s=s||30,!Object.keys(U).length&&J.LxSourceKw&&(D(J.LxSourceKw),D(J.LxSourceKg),D(J.LxSourceTx),D(J.LxSourceWy),D(J.LxSourceMg));var c=q.filter(function(i){return U[i]}),d={};typeof a=="function"&&a({phase:"start",sources:c.slice(),done:0,total:c.length});var x=c.map(function(i){var k=Date.now();return B(i,m,o,s).then(function(L){return d[i]=Date.now()-k,{id:i,res:L}}).catch(function(L){return d[i]=Date.now()-k,{id:i,error:L}})}),_=12e3,v=[],I=c.length,f=!1,b=Promise.all(x.map(function(i,k){return i.then(function(L){return f||(v.push(L),I--,typeof a=="function"&&a({done:v.length,total:c.length,last:L,ms:d[L.id]})),L})})).then(function(i){var k=[],L={},T=[];return i.forEach(function(N){if(N.error){var F=N.error&&N.error.message||String(N.error);(/cancel request|ECANCELED/i.test(F)||/ETIMEDOUT|请求超时/.test(F))&&(F="请求超时"),T.push({source:N.id,message:F}),L[N.id]={list:[],total:0};return}var W=N.res&&N.res.list||[];L[N.id]={list:W,total:N.res&&N.res.total||W.length},k=k.concat(W)}),k=S(k),k=Q(k,m),{list:k,bySource:L,errors:T,timings:d}}),y=null,h=new Promise(function(i){y=setTimeout(function(){i("__TIMEOUT__")},_)});return Promise.race([b,h]).then(function(i){if(clearTimeout(y),i!=="__TIMEOUT__")return i;f=!0;var k=[],L={},T=[];return v.forEach(function(N){if(N.error){T.push({source:N.id,message:N.error&&N.error.message||String(N.error)}),L[N.id]={list:[],total:0};return}var F=N.res&&N.res.list||[];L[N.id]={list:F,total:N.res&&N.res.total||F.length},k=k.concat(F)}),k=S(k),k=Q(k,m),I>0&&T.push({source:"slow",message:I+" 个平台响应慢，已跳过"}),{list:k,bySource:L,errors:T,timings:d}})}function g(m){var o={};return m.forEach(function(s){var a=String(s.name||"").toLowerCase().replace(/\s+/g,"")+"|"+String(s.singer||"").toLowerCase().replace(/\s+/g,"");o[a]||(o[a]={name:s.name,singer:s.singer,items:[]}),o[a].items.push(s)}),Object.keys(o).map(function(s){return o[s]})}J.LxSources={register:D,list:K,searchOne:B,searchAll:C,groupBySong:g}})(window),(function(J){"use strict";var U=J.LxRequest,q=null,D=null;function K(E){q&&(q.cancelHttp(),q=null);var B="https://searchtip.kugou.com/getSearchTip?MusicTipCount=10&keyword="+encodeURIComponent(E);return q=U.httpFetch(B,{headers:{referer:"https://www.kugou.com/"},timeout:4e3}),q.promise.then(function(C){var g=C.body,m=g&&g.data&&g.data[0]&&g.data[0].RecordDatas;return Array.isArray(m)?m.map(function(o){return o.HintInfo}).filter(Boolean):[]}).catch(function(){return[]})}function S(E){D&&(D.cancelHttp(),D=null);var B="https://tips.kuwo.cn/t.s?corp=kuwo&newver=3&p2p=1&notrace=0&c=mbox&w="+encodeURIComponent(E)+"&encoding=utf8&rformat=json";return D=U.httpFetch(B,{headers:{Referer:"http://www.kuwo.cn/"},timeout:4e3}),D.promise.then(function(C){var g=C.body,m=g&&g.WORDITEMS;return Array.isArray(m)?m.map(function(o){return o.RELWORD}).filter(Boolean):[]}).catch(function(){return[]})}function Q(E){return E=String(E||"").trim(),E?Promise.all([K(E),S(E)]).then(function(B){var C={},g=[];return B.forEach(function(m){m.forEach(function(o){var s=String(o).trim();!s||C[s]||(C[s]=!0,g.push(s))})}),g.slice(0,10)}):Promise.resolve([])}J.LxTipSearch={tipSearch:Q}})(window),(function(J){"use strict";var U=J.LxRequest;function q(o){if(!o)return[];for(var s=String(o).split(/\r?\n/),a=[],c=/\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g,d=0;d<s.length;d++){var x=s[d],_=[],v;for(c.lastIndex=0;(v=c.exec(x))!==null;){var I=parseInt(v[1],10),f=parseInt(v[2],10),b=v[3]?parseInt((v[3]+"00").slice(0,3),10)/1e3:0;_.push(I*60+f+b)}if(_.length){var y=x.replace(/<[^>]*>/g,"").replace(/\[[^\]]*\]/g,"").trim();if(y)for(var h=0;h<_.length;h++)a.push({time:_[h],text:y})}}return a.sort(function(i,k){return i.time-k.time}),a}function D(o){var s=function(a){try{var c=new DecompressionStream(a);return new Response(new Blob([o]).stream().pipeThrough(c)).arrayBuffer()}catch(d){return Promise.reject(d)}};return s("deflate").catch(function(){return s("deflate-raw")})}function K(o){var s=new TextDecoder("latin1").decode(o);if(s.slice(0,10).toLowerCase()!=="tp=content")return Promise.resolve("");var a=s.indexOf(`\r
\r
`);if(a<0)return Promise.resolve("");var c=o.slice(a+4);return D(c).then(function(d){var x=new TextDecoder().decode(new Uint8Array(d)).trim(),_;try{_=atob(x)}catch{return""}for(var v="yeelion",I=new Uint8Array(_.length),f=0;f<_.length;f++)I[f]=_.charCodeAt(f)^v.charCodeAt(f%v.length);return new TextDecoder("utf-8").decode(I)}).catch(function(){return""})}function S(o,s){if(!o)return Promise.resolve(null);var a="http://mlyric.kuwo.cn/mobi.s?f=web&type=lyric&lrcx=1&rid="+encodeURIComponent(o)+"&encode=utf8",c=s?Math.max(2e3,s-Date.now()):8e3;return U.httpFetch(a,{timeout:Math.min(8e3,c),responseType:"arraybuffer"}).promise.then(function(d){var x=d.raw;if(!x)return null;var _=x instanceof Uint8Array?x:new Uint8Array(x);return K(_).then(function(v){if(!v||!/\[\d{1,3}:\d{1,2}/.test(v))return null;var I=q(v);return I.length?{lyric:v,parsed:I,source:"kw"}:null})}).catch(function(){return null})}function Q(o,s){var a=String(o.title||o.name||"").trim(),c=String(o.artist||o.singer||"").trim();if(!a)return Promise.resolve([]);/群星|various\s*artists?|va$/i.test(c)&&(c="");var d=function(x,_){var v="http://search.kuwo.cn/r.s?client=kt&all="+encodeURIComponent(x)+"&pn=0&rn=8&uid=794762570&ver=kwplayer_ar_9.2.2.1&vipver=1&show_copyright_off=1&newver=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1",I=s?Math.max(2e3,s-Date.now()):8e3;return U.httpFetch(v,{timeout:Math.min(8e3,I)}).promise.then(function(f){var b=f&&f.body;if(!b)return[];var y=b.abslist||b.absList||[];if(!y.length)return[];for(var h=a.toLowerCase(),i=c.toLowerCase(),k=[],L=[],T=[],N=0;N<y.length;N++){var F=y[N],W=String(F.SONGNAME||"").toLowerCase().trim(),an=String(F.ARTIST||"").toLowerCase(),on=String(F.MUSICRID||"").replace("MUSIC_","");if(on){var V=W===h||W.indexOf(h)===0,un=!i||an.indexOf(i)>-1;V&&un?k.push(on):V?L.push(on):_&&T.push(on)}}return _?k:k.concat(L)}).catch(function(){return[]})};return d((a+" "+c).trim(),!0).then(function(x){return x.length?x:d(a,!1)})}function E(o){var s={lyric:"",parsed:[],source:""};if(!o)return Promise.resolve(s);var a=o.track||o,c=o.source||a.source,d=(function(){if(!J.LxSandbox||!J.LxSandbox.hasAny()||!J.LxSandbox.getLyric)return Promise.resolve(null);try{return J.LxSandbox.getLyric(c,{songmid:a.songmid,songId:a.songmid,hash:a.hash,albumId:a.albumId,copyrightId:a.copyrightId,name:a.name,singer:a.singer}).catch(function(){return null})}catch{return Promise.resolve(null)}})();return d.then(function(x){var _=x&&(x.lyric||x.lxlyric||"");if(_&&/\[\d+:\d+/.test(_)){var v=q(_);if(v.length)return{lyric:_,tlyric:x.tlyric||"",parsed:v,source:"script"}}var I=c==="kw"?S(a.songmid):Promise.resolve(null);return I.then(function(f){if(f)return f;var b=Date.now()+6e3;return Q(o,b).then(function(y){if(!y.length)return s;var h=function(i){return i>=y.length||i>=3||Date.now()>b?Promise.resolve(s):S(y[i],b).then(function(k){return k||h(i+1)})};return h(0)})})})}var B={},C=120;function g(o,s){B[o]=s;var a=Object.keys(B);a.length>C&&delete B[a[0]]}var m=E;E=function(o){var s=o&&(o.track||o),a=(o&&o.source||s&&s.source||"")+"|"+(s&&s.songmid||"")+"|"+String(s&&s.name||o&&o.title||"");return B[a]?Promise.resolve(B[a]):m(o).then(function(c){if(c&&c.parsed&&c.parsed.length){var d=o&&(o.track||o),x=(o&&o.source||d&&d.source||"")+"|"+(d&&d.songmid||"")+"|"+String(d&&d.name||o&&o.title||"");g(x,c)}return c})},J.LxLyric={parseLrc:q,getLyric:E,decodeKwLyric:K}})(window),(function(J){"use strict";var U=J.LxRequest,q="juice_cover_cache_v1",D=["https://img1.kuwo.cn/star/albumcover/","https://img2.kuwo.cn/star/albumcover/","https://img3.kuwo.cn/star/albumcover/"],K=null;function S(){if(K)return K;try{K=JSON.parse(localStorage.getItem(q)||"{}")||{}}catch{K={}}return K}function Q(){if(K)try{var m=Object.keys(K);m.length>300&&m.slice(0,m.length-300).forEach(function(o){delete K[o]}),localStorage.setItem(q,JSON.stringify(K))}catch{}}function E(m){var o=m.songmid||m.hash||m.albumAudioId||m.id||"",s=String(m.title||m.name||"")+"|"+String(m.artist||m.singer||"");return(m.source?m.source+"|":"")+(o||s)}function B(m){if(!m)return"";var o=String(m).trim();return o=o.replace(/^\d+\//,"500/"),/^https?:/.test(o)?o:D[0]+o}function C(m){var o=String(m.title||m.name||"").trim(),s=String(m.artist||m.singer||"").trim();if(!o)return Promise.resolve(null);/群星|various\s*artists?/i.test(s)&&(s="");var a=(o+" "+s).trim(),c="http://search.kuwo.cn/r.s?client=kt&all="+encodeURIComponent(a)+"&pn=0&rn=5&uid=794762570&ver=kwplayer_ar_9.2.2.1&vipver=1&show_copyright_off=1&newver=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1";return U.httpFetch(c,{timeout:7e3}).promise.then(function(d){var x=d&&d.body&&(d.body.abslist||d.body.absList)||[];if(!x.length)return null;for(var _=o.toLowerCase(),v=s.toLowerCase(),I=null,f=0;f<x.length;f++){var b=x[f],y=String(b.SONGNAME||"").toLowerCase().trim(),h=String(b.ARTIST||"").toLowerCase(),i=y===_||y.indexOf(_)===0,k=!v||h.indexOf(v)>-1;if(i&&k&&b.web_albumpic_short){I=b;break}!I&&i&&b.web_albumpic_short&&(I=b)}return I?B(I.web_albumpic_short):null}).catch(function(){return null})}function g(m){if(!m)return Promise.resolve("");var o=m.track||m;if(m.cover)return Promise.resolve(m.cover);if(o.img)return Promise.resolve(o.img);var s=E(m),a=S(),c=a[s],d=c&&typeof c=="object"?c.url:typeof c=="string"?c:"",x=c&&typeof c=="object"&&Date.now()-(c.at||0)<168*3600*1e3;return d&&x?Promise.resolve(d):C(m).then(function(_){return _&&(a[s]={url:_,at:Date.now()},Q()),_||""})}J.LxCover={getCover:g,picUrl:B}})(window),(function(J){"use strict";var U=J.LxRequest,q="http://mobilecdn.kugou.com/api/v3",D={};function K(C){return C?String(C).replace("{size}","480").replace(/^http:/,"https:"):""}function S(C){var g=Math.round((Number(C)||0)/1e3);if(!g)return"";var m=Math.floor(g/60),o=g%60;return m+":"+(o<10?"0":"")+o}function Q(C){var g=Number(C)||0;if(!g)return"";for(var m=["B","KB","MB","GB"],o=0;g>=1024&&o<m.length-1;)g/=1024,o++;return g.toFixed(o===0?0:2)+" "+m[o]}function E(){var C=q+"/rank/list?parentid=0&apiver=2&plat=0&withsong=0";return U.httpFetch(C,{timeout:8e3}).promise.then(function(g){var m=g&&g.body&&g.body.data&&g.body.data.info;return Array.isArray(m)?m.map(function(o){return{id:o.rankid,name:o.rankname,cover:K(o.imgurl||o.banner_9||o.banner_3||""),intro:String(o.intro||"").split(`
`)[0].slice(0,40)}}).filter(function(o){return o.id&&o.name}):[]}).catch(function(){return[]})}function B(C,g,m){g=g||1,m=m||30;var o=q+"/rank/song?rankid="+encodeURIComponent(C)+"&page="+g+"&pagesize="+m+"&version=8000&plat=0&apiver=2&with_res_tag=0";return U.httpFetch(o,{timeout:1e4}).promise.then(function(s){var a=s&&s.body&&s.body.data&&s.body.data.info;return Array.isArray(a)?a.map(function(c){var d=(c.authors||[]).map(function(f){return f.author_name}).filter(Boolean).join("、");if(!d&&c.filename){var x=String(c.filename).split(" - ");x.length>1&&(d=x[0])}var _=String(c.audio_id||c.album_audio_id||c.hash||""),v=[],I={};return c.hash&&c.filesize&&(v.push({type:"128k",size:Q(c.filesize),hash:c.hash}),I["128k"]={size:Q(c.filesize),hash:c.hash}),c.hash_high&&c.filesize_high&&(v.push({type:"320k",size:Q(c.filesize_high),hash:c.hash_high}),I["320k"]={size:Q(c.filesize_high),hash:c.hash_high}),c.sqhash&&c.sqfilesize&&(v.push({type:"flac",size:Q(c.sqfilesize),hash:c.sqhash}),I.flac={size:Q(c.sqfilesize),hash:c.sqhash}),{name:c.songname||c.remark||"",singer:d,source:"kg",songmid:_,albumAudioId:c.album_audio_id,hash:c.hash,albumId:c.album_id,interval:S((Number(c.duration)||0)*1e3),img:K(c.album_sizable_cover||c.cover||""),types:v,_types:I,typeUrl:{}}}).filter(function(c){return c.name}):[]}).catch(function(){return[]})}J.LxDiscover={listRanks:E,rankSongs:B}})(window),(function(J){"use strict";var U="/lx-user-api-sandbox.html",q=12e3,D=[];function K(x){var _=String(x||"").slice(0,4096),v=function(h){var i=new RegExp("^[ \\t]*(?:\\*|//|/\\*+!?)?[ \\t]*@"+h+"[ \\t\\u3000\\u00a0]+([^\\r\\n]+?)[ \\t]*(?:\\*/)?[ \\t]*$","m"),k=i.exec(_);return k?k[1].trim():""},I=v("name"),f="未命名音源";if(!I){for(var b=0,y=0;y<x.length;y++)b=b*31+x.charCodeAt(y)|0;f="未命名音源_"+(b>>>0).toString(36).slice(0,6)}return{name:I||f,description:v("description"),version:v("version"),author:v("author"),homepage:v("homepage")||v("repository"),rawScript:x}}function S(x){var _=J.LxRequest,v=x.headers||{},I={method:(x.method||"get").toLowerCase(),headers:v,timeout:x.timeout||2e4,kind:"api"};return x.form?I.form=x.form:x.body!=null&&(I.body=x.body),_.httpFetch(x.url,I).promise.then(function(f){return{statusCode:f.statusCode,statusMessage:f.statusMessage,headers:f.headers,bytes:f.raw?f.raw.length:0,raw:f.raw,body:f.body}})}function Q(x,_){return new Promise(function(v,I){var f=document.createElement("iframe");f.setAttribute("sandbox","allow-scripts"),f.style.display="none",f.src=U;var b={id:"sb_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,6),iframe:f,scriptInfo:_,sources:{},requestSeq:0,aborted:{}},y=!1,h=null,i=new Promise(function(N){h=N});function k(){clearTimeout(L);try{window.removeEventListener("message",T)}catch{}try{f.parentNode&&f.parentNode.removeChild(f)}catch{}b.sources={},b.dead=!0}b.teardown=k;var L=setTimeout(function(){y||(y=!0,k(),I(new Error("音源「"+_.name+"」加载超时")))},q);function T(N){if(N.source===f.contentWindow){var F=N.data;if(!(!F||typeof F!="object"))switch(F.type){case"ready":h&&h();break;case"inited":{var W=F.data&&F.data.sources,an={};if(W&&typeof W=="object"&&Object.keys(W).forEach(function(V){W[V]&&W[V].type==="music"&&(an[V]=W[V])}),!Object.keys(an).length){var on=F.data&&F.data.message||"音源「"+_.name+"」未声明任何可用平台";y||(y=!0,k(),I(new Error(on)));break}b.sources=an,y||(y=!0,clearTimeout(L),v(b));break}case"request":{(function(V){var un=V.id;if(b.aborted[un]){delete b.aborted[un];return}var hn=function(ln){var $=f.contentWindow;if($)try{$.postMessage(ln,"*")}catch{}};S(V.payload).then(function(ln){hn({type:"request-result",id:un,resp:ln})}).catch(function(ln){hn({type:"request-result",id:un,error:ln&&ln.message||String(ln)})})})(F);break}case"abort":b.aborted[F.id]=!0;break;case"error":console.error("[音源:"+_.name+"]",F.message);break}}}window.addEventListener("message",T),document.body.appendChild(f),i.then(function(){f.contentWindow.postMessage({type:"init",script:x,scriptInfo:_},"*")})})}function E(x,_){var v=++x.requestSeq;return new Promise(function(I,f){var b=setTimeout(function(){window.removeEventListener("message",y),f(new Error("音源「"+x.scriptInfo.name+"」请求超时"))},8e3);function y(h){if(h.source===x.iframe.contentWindow){var i=h.data;!i||i.type!=="invoke-result"||i.reqId!==v||(clearTimeout(b),window.removeEventListener("message",y),i.error?f(new Error(i.error)):I(i.result))}}window.addEventListener("message",y),x.iframe.contentWindow.postMessage({type:"invoke-request",reqId:v,payload:_},"*")})}function B(x){var _=K(x);return Q(x,_).then(function(v){return D.push(v),{id:v.id,name:v.scriptInfo.name,version:v.scriptInfo.version,sources:Object.keys(v.sources)}})}function C(x){return D.filter(function(_){var v=_.sources[x];return v&&v.actions&&v.actions.indexOf("musicUrl")>-1})}function g(x,_,v,I){return E(x,{source:_,action:"musicUrl",info:{type:I||"128k",musicInfo:v}})}function m(x,_,v){var I=C(x);if(!I.length)return Promise.reject(new Error("没有音源支持 "+x+" 的播放地址获取"));var f=[];function b(y){if(y>=I.length)return Promise.reject(new Error(f.join(`
`)));var h=I[y];return g(h,x,_,v).catch(function(i){return f.push(h.scriptInfo.name+": "+(i&&i.message||i)),b(y+1)})}return b(0)}function o(x,_){var v=D.find(function(I){var f=I.sources[x];return f&&f.actions&&f.actions.indexOf("lyric")>-1});return v?E(v,{source:x,action:"lyric",info:{musicInfo:_}}):Promise.reject(new Error("没有音源支持歌词"))}function s(){D.forEach(function(x){x.teardown?x.teardown():x.iframe.remove()}),D=[]}function a(x,_){D=D.filter(function(v){return v.scriptInfo.name===x&&v.scriptInfo.version===_?(v.teardown?v.teardown():v.iframe.remove(),!1):!0})}function c(){return D.map(function(x){return{id:x.id,name:x.scriptInfo.name,version:x.scriptInfo.version,sources:Object.keys(x.sources)}})}function d(){return D.length>0}J.LxSandbox={parseScriptInfo:K,load:B,getMusicUrl:m,getMusicUrlFrom:g,candidatesFor:C,getLyric:o,destroy:s,removeByName:a,listLoaded:c,hasAny:d}})(window),(function(J){"use strict";var U="juice_lx_sources_v1",q=!1;function D(){q||(J.LxSources.register(J.LxSourceKw),J.LxSources.register(J.LxSourceKg),J.LxSources.register(J.LxSourceTx),J.LxSources.register(J.LxSourceWy),J.LxSources.register(J.LxSourceMg),q=!0)}function K(){try{var y=localStorage.getItem(U),h=y?JSON.parse(y):[];return Array.isArray(h)?h:[]}catch{return[]}}function S(y){try{localStorage.setItem(U,JSON.stringify(y))}catch{}}function Q(){return K().map(function(y){return{id:y.id,name:y.name,version:y.version,enabled:y.enabled!==!1}})}function E(y){if(!y||!String(y).trim())return Promise.reject(new Error("脚本内容为空"));if(!/^\s*\/\*[\s\S]+?\*\//.test(y))return Promise.reject(new Error("无效的音源文件：缺少 /*! ... */ 头部注释"));var h=J.LxSandbox.parseScriptInfo(y),i=K(),k=i.filter(function(T){return T.script===y})[0],L={id:k?k.id:"src_"+Date.now().toString(36)+Math.random().toString(36).slice(2,6),name:h.name,version:h.version,script:y,enabled:!0};return k?i=i.map(function(T){return T.id===k.id?L:T}):i.push(L),S(i),J.LxSandbox.load(y).then(function(T){return{id:L.id,name:T.name,version:T.version,sources:T.sources}})}function B(y){var h=K(),i=h.filter(function(k){return k.id===y})[0];i&&J.LxSandbox.removeByName(i.name,i.version),S(h.filter(function(k){return k.id!==y}))}function C(){var y=K().filter(function(k){return k.enabled!==!1});if(!y.length)return Promise.resolve([]);var h=[],i=Promise.resolve();return y.forEach(function(k){i=i.then(function(){return J.LxSandbox.load(k.script).then(function(L){h.push({ok:!0,name:L.name,sources:L.sources})}).catch(function(L){h.push({ok:!1,name:k.name,error:L&&L.message||String(L)})})})}),i.then(function(){return h})}function g(){var y=J.LX_BUILTIN_SOURCES;return!Array.isArray(y)||!y.length?Promise.resolve({ok:0,fail:0}):Promise.all(y.map(function(h){return J.LxSandbox.load(h.script).then(function(){return 1}).catch(function(){return 0})})).then(function(h){var i=h.reduce(function(L,T){return L+T},0),k=h.length-i;return console.log("[LxMusic] 内置音源: "+i+" 个加载成功，"+k+" 个失败"),{ok:i,fail:k}})}function m(y,h,i){return D(),J.LxSources.searchAll(y,h||1,30,i)}function o(y){var h=J.LxTipSearch?J.LxTipSearch.tipSearch(y):Promise.resolve([]);return h.catch(function(){return[]})}var s=Promise.resolve(),a=0,c={};function d(y){var h=String(y.interval||"").split(":").map(Number);return h.length<2||h.some(isNaN)?0:h.length===3?h[0]*3600+h[1]*60+h[2]:h[0]*60+h[1]}function x(y){return new Promise(function(h){var i=document.createElement("audio"),k=!1,L=setTimeout(function(){T(-2)},4e3);function T(N){if(!k){k=!0,clearTimeout(L),i.onloadedmetadata=null,i.onerror=null;try{i.removeAttribute("src"),i.load()}catch{}h(N)}}i.preload="metadata",i.onloadedmetadata=function(){T(isFinite(i.duration)?i.duration:-1)},i.onerror=function(){T(-1)},i.src=y})}function _(y,h){if(!J.LxSandbox.hasAny())return Promise.reject(new Error("尚未导入音源脚本，无法获取播放地址"));var i=++a,k={songmid:y.songmid,songId:y.songmid,hash:y.hash,albumId:y.albumId,albumAudioId:y.albumAudioId,copyrightId:y.copyrightId,strMediaMid:y.strMediaMid,name:y.name,singer:y.singer,types:y.types,_types:y._types},L=d(y),T=s.then(function(){if(i!==a)throw new Error("已被更新的取址请求取代");var W=J.LxSandbox.candidatesFor?J.LxSandbox.candidatesFor(y.source):[];if(!W.length)return J.LxSandbox.getMusicUrl(y.source,k,h||"128k");W=W.slice().sort(function(V,un){return(c[V.scriptInfo.name]||0)-(c[un.scriptInfo.name]||0)});var an=[];function on(V){if(V>=W.length)return Promise.reject(new Error(an.join("；")||"没有音源返回可用地址"));if(i!==a){var un=new Error("已被更新的取址请求取代");return un.code="SUPERSEDED",Promise.reject(un)}var hn=W[V],ln=function($){return an.push(hn.scriptInfo.name+": "+$),on(V+1)};return J.LxSandbox.getMusicUrlFrom(hn,y.source,k,h||"128k").then(function($){return $?typeof $!="string"||!/^https?:\/\//i.test($)?ln("返回的不是音频地址（"+String($).slice(0,24)+"…）"):L?x($).then(function(gn){return gn<=0||Math.abs(gn-L)<=5?$:(c[hn.scriptInfo.name]=(c[hn.scriptInfo.name]||0)+1,ln("时长不符（应为 "+L+"s，实际 "+Math.round(gn)+"s）"))}):$:ln("空地址")},function($){return ln($&&$.message||String($))})}return on(0)}),N=null,F=new Promise(function(W,an){N=setTimeout(function(){s=Promise.resolve(),an(new Error("音源全部无响应（超过 "+Math.round(v/1e3)+" 秒）"))},v),T.then(function(on){clearTimeout(N),W(on)},function(on){clearTimeout(N),an(on)})});return s=T.catch(function(){}),F}var v=18e3;function I(){D();var y=J.LxSources.list().map(function(k){return k.id}),h=[],i=Promise.resolve();return y.forEach(function(k){i=i.then(function(){var L=Date.now();return J.LxSources.searchOne(k,"测试",1,5).then(function(T){h.push({source:k,ms:Date.now()-L,ok:!0,count:T.list.length})}).catch(function(T){h.push({source:k,ms:Date.now()-L,ok:!1,err:T&&T.message||String(T)})})})}),i.then(function(){return h})}function f(){return J.LxSandbox.hasAny()}function b(){return J.LxSandbox.listLoaded()}J.LxMusic={ready:D,search:m,tipSearch:o,resolveUrl:_,importScript:E,listScripts:Q,removeScript:B,loadSavedScripts:C,loadBuiltinScripts:g,hasSource:f,diagnose:I,listLoaded:b,sources:function(){return D(),J.LxSources.list()}}})(window),(function(){"use strict";var J="juice_music_v1",U=null,q="search",D=!1;function K(){return{volume:.8,repeat:"all",shuffle:!1,src:{builtin:"lx"},lists:[],history:[]}}var S=K();function Q(){try{var n=localStorage.getItem("juice_music_show_lyric");n!==null&&(Z=n==="1")}catch{}try{var e=localStorage.getItem(J);if(!e)return;var r=JSON.parse(e);if(r&&typeof r=="object"){S=Object.assign(K(),r),S.src=S.src&&typeof S.src=="object"?S.src:{};var t=S.src.builtin!=="lx";S.src.builtin="lx",t&&E()}}catch{S=K()}}function E(){try{localStorage.setItem(J,JSON.stringify(S))}catch{}}var B="juice_music_live_v1",C=0,g="juice_music_pos_v1",m="";function o(){if(!de){if(!b.length||h<0){try{localStorage.removeItem(B)}catch{}try{localStorage.removeItem(g)}catch{}m="";return}var n=rn&&i&&rn.id===i.id?rn.pos:C;try{localStorage.setItem(g,JSON.stringify({id:i?i.id:"",qi:h,pos:n}))}catch{}var e=b.map(function(r){return r.id}).join(",")+"|"+y;if(e!==m)try{localStorage.setItem(B,JSON.stringify({v:1,qi:h,name:y,at:Date.now(),pos:n,queue:b.map(function(r){return{kind:r.kind,id:r.id,title:r.title,artist:r.artist,cover:r.cover||"",url:/^blob:/i.test(r.url||"")?"":r.url||"",source:r.source||"",interval:r.interval||"",track:r.track||null}})})),m=e}catch{try{m!=="MINI"&&(localStorage.setItem(B,JSON.stringify({v:1,qi:h,name:y,at:Date.now(),pos:C,queue:[]})),m="MINI")}catch{}}}}function s(){try{var n=localStorage.getItem(B);if(!n)return null;var e=JSON.parse(n);if(!e||!Array.isArray(e.queue)||!e.queue.length)return null;try{var r=JSON.parse(localStorage.getItem(g)||"null");r&&typeof r.qi=="number"&&r.qi>=0&&r.qi<e.queue.length&&(e.qi=r.qi);var t=e.queue[e.qi];r&&t&&r.id===t.id&&typeof r.pos=="number"&&(e.pos=r.pos)}catch{}return e}catch{return null}}function a(n){return window.escHtml(n)}function c(){return"m"+Date.now().toString(36)+Math.random().toString(36).slice(2,7)}function d(n,e){return'<svg class="mu-ico'+(e?" "+e:"")+'" viewBox="0 0 24 24" aria-hidden="true" data-lucide="'+n+'"></svg>'}function x(n){window.paintLucideIcons&&window.paintLucideIcons(n||document)}function _(n){n=Math.max(0,Math.floor(n||0));var e=Math.floor(n/60);return e+":"+(n%60<10?"0":"")+n%60}function v(n){var e=String(n||"").split(":").map(Number);return e.length<2||e.some(isNaN)?0:e.length===3?e[0]*3600+e[1]*60+e[2]:e[0]*60+e[1]}function I(n){return String(n||"").replace(/\.[a-zA-Z0-9]{2,5}$/,"")}var f=null,b=[],y="",h=-1,i=null,k=0;function L(){return f||(f=document.createElement("audio"),f.preload="metadata",f.volume=S.volume,f.style.display="none",document.body.appendChild(f),f.addEventListener("timeupdate",ln),f.addEventListener("loadedmetadata",ln),f.addEventListener("durationchange",ln),f.addEventListener("ended",At),f.addEventListener("play",function(){Cn(!0)}),f.addEventListener("playing",function(){k=0,i&&(i.retried=!1,i.failed=!1)}),f.addEventListener("pause",function(){Cn(!1)}),f.addEventListener("seeked",function(){de=!1,gn=0,$=Math.floor(f.currentTime||0),C=$,o()}),f.addEventListener("error",function(){if(i&&i.track&&!i.retried){i.retried=!0,i.url="";try{f.removeAttribute("src"),f.load()}catch{}P("重新获取播放地址…"),F(!0);return}if(y==="搜索结果"&&b.length>1&&k<8){k++,P("「"+(i?i.title:"")+"」已下架，自动跳下一首"),un(!0);return}i&&P("「"+i.title+"」播放失败（链接失效或格式不支持）"),Cn(!1)}),f)}function T(n,e,r){b=n.slice(),y=e||"",h=r==null||r<0||r>=b.length?0:r,F()}function N(n){if(!b.length||h<0){T([n],n.kind==="search"?"搜索结果":y,0);return}for(var e=-1,r=0;r<b.length;r++)if(b[r].id===n.id){e=r;break}if(e===h){var t=b[h];if(!t.url&&t.track&&!t.loading){F(),P("重新获取播放地址…");return}P("正在播放这首");return}if(e>-1){h=e,F(),P("已跳到这首");return}b.splice(h+1,0,n),P("已插到下一首播放"),sn&&Gn(!0),q==="lists"&&z(),o()}function F(n){if(b.length){var e=i;i=b[h];var r=!1;if(rn&&rn.id!==(i&&i.id)&&(rn=null),i!==e&&(C=0,$=-1,gn=0),!i.url&&i.track){if(!window.LxMusic||!window.LxMusic.hasSource()){P("尚未导入音源脚本");return}if(i.loading){if(n){var t=L();if(t.paused&&t.getAttribute("src"))try{t.play().catch(function(){})}catch{}else P("正在获取播放地址，稍候…")}return}var u=i,l=L();if(!l.paused)try{l.pause()}catch{}i.loading=!0,Cn(!1),fe(),On(),En(),bn(),Pn(),sn&&Gn(!0),Zn(!0),Nn=-1,ke(i),an(i);var p=++Ue,A;try{A=window.LxMusic.resolveUrl(u.track,S.quality||"128k")}catch(tn){u.loading=!1,Zn(!1),W(u,tn&&tn.message?String(tn.message).slice(0,60):"unknown");return}Promise.resolve(A).then(function(tn){if(u.loading=!1,!(p!==Ue||i!==u)){if(!tn){Zn(!1),W(u,"音源未返回地址");return}u.url=tn,Zn(!1),F(n)}}).catch(function(tn){u.loading=!1,!(p!==Ue||i!==u)&&(Zn(!1),W(u,tn&&tn.message?String(tn.message).slice(0,60):"unknown",tn&&tn.code))});return}var M=L();try{M.pause()}catch{}if(M.src=i.url,rn&&rn.id===i.id){var R=rn.pos;rn=null;var G=++He;r=!!n;var en=!1,Tn=function(){M.removeEventListener("loadedmetadata",fn),M.removeEventListener("durationchange",fn),M.removeEventListener("canplay",fn),M.removeEventListener("canplaythrough",fn)},fn=function(){if(!en){if(G!==He){Tn();return}if(!(M.readyState<3)&&!(!isFinite(M.duration)||M.duration<=0)){if(en=!0,Tn(),R>0&&R<M.duration-2)try{M.currentTime=R}catch{}ln(),r&&(r=!1,M.play().catch(function(){}))}}};M.readyState>=3&&isFinite(M.duration)&&M.duration>0?fn():(M.addEventListener("loadedmetadata",fn),M.addEventListener("durationchange",fn),M.addEventListener("canplay",fn),M.addEventListener("canplaythrough",fn))}r||M.play().catch(function(){}),fe(),Cn(!M.paused),On(),En(),bn(),Pn(),sn&&Gn(!0),Nn=-1,ke(i),an(i),O&&Ie(),o()}}function W(n,e,r){if(r!=="SUPERSEDED"){var t=L();try{t.pause()}catch{}try{t.removeAttribute("src"),t.load()}catch{}n.failed=!0,Cn(!1),On(),En(),bn(),Pn(),sn&&Gn(!0),P("「"+(n.title||"这首")+"」取不到播放地址："+e)}}function an(n){if(!(!n||n.cover)&&window.LxCover){var e=n.id||n.title+"|"+n.artist;window.LxCover.getCover(n).then(function(r){if(!(!r||!i||(i.id||i.title+"|"+i.artist)!==e)){i.cover=r,b[h]&&(b[h].cover=r),fe(),On();var t=document.getElementById("muDisc");if(t&&t.classList.toggle("spin",!f.paused&&!!r),O){var u=O.querySelector(".mu-imm-disc");u&&(u.innerHTML='<img src="'+a(r)+'" alt="">');var l=O.querySelector(".mu-imm-vinyl");l&&l.classList.toggle("spin",!f.paused)}bn()}}).catch(function(){})}}function on(n){if(n=Math.max(0,isFinite(n)?n:0),f&&f.duration){try{f.currentTime=n}catch{}return}rn&&i&&rn.id===i.id&&(rn.pos=n,C=Math.floor(n),$=Math.floor(n),gn=0,o(),ln())}function V(){if(!i){he().length?T(he(),"直链歌单",0):me().length?T(me(),"本机文件",0):P("先导入一些音乐吧");return}var n=L();if(!n.getAttribute("src")){F(!0);return}if(n.error){i.url="",F(!0);return}n.paused?n.play().catch(function(){}):n.pause()}function un(n){if(b.length){if(S.repeat==="one"&&n){f.currentTime=0,f.play().catch(function(){});return}var e=0;if(S.shuffle&&b.length>1){var r;do if(r=Math.floor(Math.random()*b.length),++e>b.length*2)break;while((r===h||b[r].failed)&&e<=b.length*2);h=r}else do if(h++,h>=b.length&&(h=0),++e>b.length)break;while(b[h].failed&&e<=b.length);F()}}function hn(){if(b.length){if(f&&f.currentTime>3){f.currentTime=0;return}h=h>0?h-1:b.length-1,F()}}function ln(){var n=0,e=0,r=0;if(f&&(e=f.currentTime||0,r=f.duration||0,n=r?e/r:0),!r&&rn&&i&&rn.id===i.id){var t=v(i.interval);t&&(r=t,e=rn.pos,n=Math.min(1,e/r))}for(var u=document.querySelectorAll(".mu-bar-progress i"),l=0;l<u.length;l++)u[l].style.width=(n*100).toFixed(2)+"%";for(var p=document.querySelectorAll(".mu-time-cur"),A=0;A<p.length;A++)p[A].textContent=_(e);for(var M=document.querySelectorAll(".mu-time-dur"),R=0;R<M.length;R++)M[R].textContent=_(r);for(var G=document.querySelectorAll(".mu-seek"),en=0;en<G.length;en++)r&&(G[en].max=String(r)),document.activeElement!==G[en]&&r&&(G[en].value=String(e));if("mediaSession"in navigator&&f&&f.duration)try{navigator.mediaSession.setPositionState({duration:f.duration,playbackRate:1,position:e})}catch{}O&&le(e),St(e),yt(e,r),gt(e)}var $=-1,gn=0,He=0,Ue=0;function gt(n){if(!de&&!rn){var e=Math.floor(n||0);(e>0||f&&f.duration>0&&f.currentTime===0)&&(C=e);var r=Date.now();e===$&&r-gn<4e3||r-gn<2e3||($=e,gn=r,o())}}function yt(n,e){var r=document.getElementById("muPtCur"),t=document.getElementById("muPtDur");if(!(!r||!t)){if(!e&&rn&&i&&rn.id===i.id){r.textContent=_(rn.pos),t.textContent="0:00";return}r.textContent=_(n),t.textContent=e?_(e):"0:00"}}var oe="";function St(n){var e=document.getElementById("muBarLyric");if(e){var r=yn&&yn.parsed;if(!r||!r.length){oe&&(e.textContent="",oe="");return}for(var t=0,u=r.length-1,l=-1;t<=u;){var p=t+u>>1;r[p].time<=n?(l=p,t=p+1):u=p-1}var A=l>=0?r[l].text:"";A!==oe&&(oe=A,e.textContent=A)}}function At(){un(!0)}function Mn(n){S.volume=Math.min(1,Math.max(0,n)),f&&(f.volume=S.volume),E();for(var e=document.querySelectorAll(".mu-vol"),r=0;r<e.length;r++)e[r].value=String(S.volume);for(var t=document.querySelectorAll("#muBarVolNum, #muImmVolNum"),u=0;u<t.length;u++)t[u].textContent=String(Math.round(S.volume*100));typeof Ne=="function"&&Ne(),typeof be=="function"&&be()}function fe(){if(!(!("mediaSession"in navigator)||!i))try{navigator.mediaSession.metadata=new MediaMetadata({title:i.title||"未知曲目",artist:i.artist||"",album:"我的音乐台",artwork:i.cover?[{src:i.cover,sizes:"512x512"}]:[]}),navigator.mediaSession.setActionHandler("play",function(){f.play().catch(function(){})}),navigator.mediaSession.setActionHandler("pause",function(){f.pause()}),navigator.mediaSession.setActionHandler("previoustrack",hn),navigator.mediaSession.setActionHandler("nexttrack",function(){un(!1)});try{navigator.mediaSession.setActionHandler("seekto",function(n){f&&typeof n.seekTime=="number"&&isFinite(n.seekTime)&&(f.currentTime=n.seekTime)})}catch{}}catch{}}var Bn=[],jn=null;function me(){return Bn.map(function(n){return{kind:"local",id:n.title+":"+n.size,title:n.title,artist:"本机文件",cover:"",url:n.url}})}function Oe(){return new Promise(function(n){var e=indexedDB.open("juice_music",1);e.onupgradeneeded=function(){e.result.createObjectStore("kv")},e.onsuccess=function(){n(e.result)},e.onerror=function(){n(null)}})}function bt(n,e){return Oe().then(function(r){if(r)try{r.transaction("kv","readwrite").objectStore("kv").put(e,n)}catch{}})}function vt(n){return new Promise(function(e){Oe().then(function(r){if(!r){e(null);return}try{var t=r.transaction("kv").objectStore("kv").get(n);t.onsuccess=function(){e(t.result||null)},t.onerror=function(){e(null)}}catch{e(null)}})})}function Ge(n){for(var e=0,r=0;r<n.length;r++){var t=n[r];!/^audio\//.test(t.type)&&!/\.(mp3|flac|ogg|wav|m4a|aac|opus)$/i.test(t.name)||(Bn.push({title:I(t.name),size:t.size,url:URL.createObjectURL(t)}),e++)}e?(S.localMeta=Bn.map(function(u){return{title:u.title,size:u.size}}),S.folderName="",E(),P("已加入 "+e+" 首本机音乐"),bn()):P("没有识别到音频文件")}function wr(){vt("folder").then(function(n){jn=n||null,bn()})}function De(){if(!window.showDirectoryPicker){P("当前浏览器不支持文件夹关联，请用「选择文件」");return}window.showDirectoryPicker().then(function(n){return jn=n,S.folderName=n.name||"",bt("folder",n),Ee()}).catch(function(){})}function kt(){if(!jn){De();return}jn.queryPermission({mode:"read"}).then(function(n){return n==="granted"?Ee():jn.requestPermission({mode:"read"}).then(function(e){if(e==="granted")return Ee();P("没有获得文件夹读取权限")})}).catch(function(){})}function Ee(){if(!jn)return Promise.resolve();var n=[],e=["node_modules",".git"];function r(t,u){if(u>3)return Promise.resolve();var l;try{l=t.values()}catch{return Promise.resolve()}function p(){return l.next().then(function(A){if(!A.done){var M=A.value;return M.kind==="directory"?e.indexOf(M.name)>=0?p():r(M,u+1).then(p):(/\.(mp3|flac|ogg|wav|m4a|aac|opus)$/i.test(M.name)&&n.push(M.getFile().then(function(R){Bn.push({title:I(R.name),size:R.size,url:URL.createObjectURL(R)})}).catch(function(){})),p())}})}return p()}return Bn.forEach(function(t){if(t.url){var u=b.some(function(l){return l.url===t.url});if(!u&&!(i&&i.url===t.url))try{URL.revokeObjectURL(t.url)}catch{}}}),Bn=[],r(jn,0).then(function(){S.localMeta=Bn.map(function(t){return{title:t.title,size:t.size}}),E(),P("已从「"+(S.folderName||"文件夹")+"」载入 "+Bn.length+" 首"),bn()})}function he(){return(S.direct||[]).map(function(n){return{kind:"link",id:n.id,title:n.title,artist:n.artist||"",cover:n.cover||"",url:n.url}})}var It=JSON.stringify([{title:"示例歌曲",artist:"歌手",cover:"https://example.com/cover.jpg",url:"https://example.com/song.mp3"}],null,2);function wt(n){var e;try{e=JSON.parse(n)}catch{P("JSON 格式不对");return}if(!Array.isArray(e)){P("歌单要是一个 JSON 数组");return}var r=0;e.forEach(function(t){!t||!t.url||!/^https?:\/\//i.test(t.url)||(S.direct.push({id:c(),title:String(t.title||I(String(t.url).split("/").pop())||"未命名"),artist:String(t.artist||""),cover:/^https?:\/\//i.test(t.cover||"")?t.cover:"",url:t.url}),r++)}),E(),P(r?"导入 "+r+" 首直链歌曲":"没有可用的条目（每条必须有 http(s) 的 url）"),bn()}var _e=["https://discoveryprovider.audius.co","https://discoveryprovider2.audius.co","https://discoveryprovider3.audius.co"],pe=null;function Ke(n,e){return Promise.race([fetch(n).then(function(r){return r.json()}),new Promise(function(r,t){setTimeout(function(){t(new Error("超时"))},e||9e3)})])}function Ut(n){var e=function(t){if(t>=_e.length)return Promise.reject(new Error("所有 Audius 节点不可达（可能被墙）"));var u=_e[t];return Ke(u+"/v1/tracks/search?query="+encodeURIComponent(n)+"&app_name=juice-persona&limit=30").then(function(l){var p=l&&l.data||[];return p.length?(pe=u,p.filter(function(A){return A.streamable!==!1&&A.duration>0&&!A.is_delete}).map(function(A){return{kind:"search",id:"au_"+A.id,title:A.title||"未命名",artist:A.user&&A.user.name||"Audius",cover:A.artwork&&(A.artwork["480x480"]||A.artwork["150x150"])||"",url:u+"/v1/tracks/"+A.id+"/stream?app_name=juice-persona",durMs:(A.duration||0)*1e3}})):(pe=u,[])}).catch(function(){return e(t+1)})};if(pe){var r=pe;_e=[r].concat(_e.filter(function(t){return t!==r}))}return e(0)}function Et(n){var e=S.src&&S.src.jamendoKey||"";return e?Ke("https://api.jamendo.com/v3.0/tracks/?client_id="+encodeURIComponent(e)+"&format=json&limit=30&search="+encodeURIComponent(n)).then(function(r){if(!r||r.headers&&r.headers.status==="failed")throw new Error(r&&r.headers&&r.headers.error_message||"Jamendo 返回失败（检查 Client ID）");return(r.results||[]).map(function(t){return{kind:"search",id:"jm_"+t.id,title:t.name||"未命名",artist:t.artist_name||"Jamendo",cover:t.image||"",url:t.audio,durMs:(t.duration||0)*1e3}})}):Promise.reject(new Error("请先填写 Jamendo 免费 Client ID"))}function Lt(n){var e=S.src.builtin;return e==="jamendo"?Et(n):Ut(n)}var Le=null;function Ur(n){try{var e=new Function("window",`"use strict";
`+n.code+`
return (typeof MusicSource!=="undefined"&&MusicSource)||(window.MusicSource&&window.MusicSource)||null;`),r=e(window);return!r||typeof r.search!="function"?(P("音源脚本必须定义 MusicSource 对象且带 search(keyword) 函数"),!1):(Le=r,P("音源「"+(r.name||n.name)+"」已加载"),!0)}catch(t){return P("音源脚本加载出错："+t.message),!1}}var vn="love";function Je(){var n=S.lists.filter(function(e){return e.id===vn})[0];return n||(n={id:vn,name:"我的收藏",tracks:[]},S.lists.unshift(n),E()),n}function Qn(n){return Je(),S.lists.filter(function(e){return e.id===n})[0]||null}function Rn(n,e){var r=Qn(n);if(!r||!e)return!1;var t=Fn(e);return r.tracks.some(function(u){return Fn(u)===t})}function Fn(n){return n?n.track?n.track.source+"|"+n.track.songmid:n.id||n.title+"|"+n.artist:""}function se(n,e){var r=Qn(n);return!r||!e||Rn(n,e)?!1:(r.tracks.push({id:e.id,title:e.title,artist:e.artist,cover:e.cover||"",source:e.source||e.track&&e.track.source||"",interval:e.interval||"",track:e.track||null,addedAt:Date.now()}),E(),!0)}function Jt(n,e){var r=Qn(n);if(!r)return!1;var t=Fn(e),u=r.tracks.length;return r.tracks=r.tracks.filter(function(l){return Fn(l)!==t}),E(),r.tracks.length<u}function ge(n){if(n=String(n||"").trim(),!n)return null;var e={id:"list_"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),name:n,tracks:[]};return S.lists.push(e),E(),e}function Ct(n){return n===vn?!1:(S.lists=S.lists.filter(function(e){return e.id!==n}),E(),!0)}function ye(n){return Rn(vn,n)?(Jt(vn,n),!1):(se(vn,n),!0)}function qt(n){n=String(n||"").trim(),n&&(S.history=[n].concat(S.history.filter(function(e){return e!==n})).slice(0,20),E())}function Tt(n){return n=String(n||"").trim().toLowerCase(),n?S.history.filter(function(e){return e.toLowerCase().indexOf(n)>-1}).slice(0,8):S.history.slice(0,8)}var kn="love",zn=!1,Ce=0,qe=!1,Wn="",Z=!0,yn=null,Hn="",Sn=[],ne=.7;function Mt(n){if(n){var e=S.src.builtin==="custom"?"lx":S.src.builtin;if(e==="lx"){if(!window.LxMusic){P("音源内核未加载");return}zn=!0,Wn="正在连接各平台…";var r=++Ce;z(),window.LxMusic.search(n,1,function(t){t.phase==="start"?Wn="正在请求 "+t.total+" 个平台（"+(t.sources||[]).map(function(l){return je[l]||l}).join("/")+"）…":Wn="已完成 "+t.done+"/"+t.total+" 个平台"+(t.last&&t.last.id?"（"+t.last.id+" "+t.ms+"ms）":"")+"…";var u=document.querySelector(".mu-loading-text");u&&(u.textContent=Wn)}).then(function(t){if(r===Ce){if(zn=!1,Wn="",Sn=t.list.map(function(l){return{kind:"search",id:l.source+"_"+l.songmid,title:l.name,artist:l.singer,cover:l.img||"",url:"",track:l,source:l.source,interval:l.interval}}),Yn!=="all"){var u=Sn.some(function(l){return l.source===Yn});u||(Yn="all")}z(),Sn.length?t.errors.length?P("搜到 "+Sn.length+" 首，"+t.errors.length+" 个平台失败"):P("搜到 "+Sn.length+" 首"):P(t.errors.length?"没有搜到结果（"+t.errors[0].message+"）":"没有搜到结果")}}).catch(function(t){r===Ce&&(zn=!1,Wn="",z(),P("搜索失败："+(t&&t.message?t.message:"unknown")))});return}if(e!=="custom"){P("搜索中…"),Lt(n).then(function(t){Sn=t.slice(0,100),bn(),Sn.length||P("没有搜到结果")}).catch(function(t){P("搜索失败："+(t&&t.message?t.message:"unknown"))});return}if(!Le){P("先加载一个音源脚本");return}P("搜索中…"),Promise.resolve(Le.search(n)).then(function(t){var u=t&&t.items?t.items:Array.isArray(t)?t:[];Sn=u.filter(function(l){return l&&l.url}).slice(0,100).map(function(l){return{kind:"search",id:c(),title:String(l.title||"未命名"),artist:String(l.artist||l.album||""),cover:/^https?:\/\//i.test(l.cover||"")?l.cover:"",url:String(l.url)}}),bn(),Sn.length||P("没有搜到结果")}).catch(function(t){P("搜索失败："+(t&&t.message?t.message:"unknown"))})}}function Er(n,e){if(n){if(n.url){T([n],e,0);return}if(!n.track){P("这首没有播放地址");return}if(!window.LxMusic||!window.LxMusic.hasSource()){P("尚未导入音源脚本，无法获取播放地址");return}P("获取播放地址…");var r=S.quality||"128k";window.LxMusic.resolveUrl(n.track,r).then(function(t){if(!t){P("音源未返回地址");return}n.url=t,T([n],e,0)}).catch(function(t){P("取地址失败："+(t&&t.message?String(t.message).slice(0,60):"unknown"))})}}function Te(n,e,r){var t=Fn(n),u=!!i&&y===r&&!!t&&t===Fn(i),l=Rn(vn,n),p=n.interval||(n.durMs?_(n.durMs/1e3):""),A=[n.artist,n.source?String(n.source).toUpperCase():""].filter(Boolean).join(" · "),M=u&&f&&!f.paused;return'<div class="mu-row'+(u?" active":"")+'" data-play="'+r+'" data-idx="'+e+'"><span class="mu-row-ico">'+(n.cover?'<img src="'+a(n.cover)+'" alt="" loading="lazy">':d(M?"Pause":"Play"))+'</span><span class="mu-row-main"><b>'+a(n.title)+"</b>"+(A?"<i>"+a(A)+"</i>":"")+'</span><span class="mu-row-ops"><button class="mu-love'+(l?" on":"")+'" data-love="'+e+'" title="'+(l?"取消收藏":"收藏")+'">'+d("Heart")+'</button><button class="mu-addlist" data-addlist="'+e+'" title="加入歌单">'+d("ListPlus")+"</button></span>"+(p?'<span class="mu-row-dur">'+p+"</span>":"")+"</div>"}function Lr(){var n=S.localMeta.length&&!Bn.length,e=me().map(function(r,t){return Te(r,t,"本机文件")}).join("");return'<div class="mu-panel"><h3 class="mu-h3">📁 本机音乐</h3><p class="mu-note">文件只在你自己的浏览器里读取，不会上传到任何服务器。</p><div class="mu-btns"><button class="mu-btn" id="muPickFiles">🎵 选择音乐文件</button><button class="mu-btn" id="muPickFolder">📂 关联本机文件夹'+(S.folderName?"（"+a(S.folderName)+"）":"")+"</button>"+(n?'<button class="mu-btn warn" id="muRelink">🔄 恢复上次 '+S.localMeta.length+" 首（需重新授权）</button>":"")+'</div><div class="mu-drop" id="muDrop">也可以把音乐文件直接拖到这里</div><input type="file" id="muFileInput" accept="audio/*,.mp3,.flac,.ogg,.wav,.m4a,.aac,.opus" multiple style="display:none">'+(e?'<div class="mu-list">'+e+"</div>":'<div class="mu-empty">还没有本机音乐</div>')+"</div>"}function Jr(){var n=he().map(function(e,r){return Te(e,r,"直链歌单")}).join("");return`<div class="mu-panel"><h3 class="mu-h3">🔗 直链歌单</h3><p class="mu-note">适合放在自己网盘 / 服务器上的音乐。粘贴 JSON 数组（每条含 title 与 http(s) 的 url，可选 artist / cover）。</p><textarea class="mu-textarea" id="muJsonIn" rows="5" placeholder='[{"title":"歌名","url":"https://…/song.mp3"}]'></textarea><div class="mu-btns"><button class="mu-btn primary" id="muJsonAdd">导入歌单</button><button class="mu-btn" id="muJsonExample">填入示例</button>`+(S.direct.length?'<button class="mu-btn danger" id="muJsonClear">清空</button>':"")+"</div>"+(n?'<div class="mu-list">'+n+"</div>":'<div class="mu-empty">还没有直链歌曲</div>')+"</div>"}var Cr=`var MusicSource = {
  name: "我的音源",
  // 必须实现：search(keyword) 返回 [{ title, artist, cover, url }]
  // url 必须是浏览器可直接播放的音频直链（注意 CORS 与 https）
  search: function (keyword) {
    return fetch("https://你的接口?q=" + encodeURIComponent(keyword))
      .then(function (r) { return r.json(); })
      .then(function (d) { return { items: d.list || [] }; });
  }
};`,je={kw:"酷我",kg:"酷狗",tx:"QQ音乐",mg:"咪咕",wy:"网易云"},Yn="all";function ee(){return Yn==="all"?Sn:Sn.filter(function(n){return n.source===Yn})}function Bt(){if(!Sn.length)return"";var n={};Sn.forEach(function(t){n[t.source]=(n[t.source]||0)+1});var e=["kw","kg","tx","mg","wy"],r=[{id:"all",label:"聚合",n:Sn.length}];return e.forEach(function(t){n[t]&&r.push({id:t,label:je[t]||t.toUpperCase(),n:n[t]})}),'<div class="mu-src-filter">'+r.map(function(t){return'<button class="mu-src-chip'+(Yn===t.id?" active":"")+'" data-src-filter="'+t.id+'">'+a(t.label)+'<span class="mu-src-chip-n">'+t.n+"</span></button>"}).join("")+"</div>"}function Rt(){var n=!!window.LxMusic,e=n&&window.LxMusic.hasSource(),r="";return e||(r='<p class="mu-note warn">还没有可用的音源脚本。曲库负责搜到歌，播放地址需要音源脚本提供——去「音源」页导入一个。</p>'),'<div class="mu-panel">'+r+'<div class="mu-searchbar"><div class="mu-search-wrap"><input class="mu-input" id="muSearchKw" autocomplete="off" placeholder="歌名或歌手"><div class="mu-suggest" id="muSuggest" hidden></div></div><button class="mu-btn primary" id="muSearchBtn"'+(zn?" disabled":"")+">"+(zn?"搜索中":"搜索")+"</button></div>"+Bt()+(zn?'<div class="mu-loading"><span class="mu-spinner"></span><span class="mu-loading-text">'+a(Wn||"正在搜索…")+"</span></div>":ee().length?'<div class="mu-list">'+ee().map(function(t,u){return Te(t,u,"搜索结果")}).join("")+"</div>":'<div class="mu-empty">搜点什么听听——支持歌名 / 歌手</div>')+"</div>"}var _n=-1;pn=null;var pn=null,An=null,In="default",Vn=!0;function Nt(){if(_n<0)return"";Je();var n=S.lists.map(function(e){return'<button class="mu-pick-list" data-pick-list="'+e.id+'">'+a(e.name)+'<span class="mu-pick-count">'+e.tracks.length+"</span></button>"}).join("");return'<div class="mu-modal-mask" id="muAddListMask"><div class="mu-modal-box"><h4 class="mu-modal-title">加入歌单</h4><div class="mu-pick-lists">'+n+'</div><div class="mu-modal-ops"><button class="mu-btn" id="muPickNew">新建歌单</button><button class="mu-btn" id="muPickCancel">取消</button></div></div></div>'}function Pt(n){var e=n.map(function(t,u){return{track:t,index:u}});if(In==="default")return e;var r;return In==="title"?r=function(t,u){return String(t.track.title||"").localeCompare(String(u.track.title||""),"zh-Hans-CN")}:In==="artist"?r=function(t,u){return String(t.track.artist||"").localeCompare(String(u.track.artist||""),"zh-Hans-CN")}:r=function(t,u){return(Number(t.track.addedAt)||0)-(Number(u.track.addedAt)||0)},e.sort(function(t,u){var l=r(t,u);return l===0?t.index-u.index:Vn?l:-l}),e}function Qt(){var n={default:"默认",title:"字母",artist:"歌手",added:"时间"}[In],e=In==="default"?"":Vn?"↑":"↓";return'<button class="mu-btn mini mu-sort-btn'+(In!=="default"?" on":"")+'" id="muListSort" title="排序：'+n+'">'+d("ArrowUpDown")+n+e+"</button>"}function Ft(){Je();var n=S.lists.filter(function(u){return u.id===kn})[0]||S.lists[0];n&&(kn=n.id);var e=S.lists.map(function(u){var l=n&&u.id===n.id;return'<button class="mu-list-tab'+(l?" active":"")+'" data-list-tab="'+u.id+'">'+a(u.name)+'<span class="mu-list-count">'+u.tracks.length+"</span></button>"}).join(""),r="";if(n&&n.tracks.length){var t=Pt(n.tracks);r='<div class="mu-list">'+t.map(function(u){var l=u.track,p=u.index,A=!!i&&Fn(i)===Fn(l),M=l.track||l,R=[l.artist||M.singer,String(M.source||l.source||"").toUpperCase()].filter(Boolean).join(" · "),G=l.interval||M.interval||"";return'<div class="mu-row'+(A?" active":"")+'" data-list-play="'+p+'"><span class="mu-row-ico">'+(l.cover||M.img?'<img src="'+a(l.cover||M.img)+'" alt="" loading="lazy">':d(A&&f&&!f.paused?"Pause":"Play"))+'</span><span class="mu-row-main"><b>'+a(l.title)+"</b>"+(R?"<i>"+a(R)+"</i>":"")+"</span>"+(G?'<span class="mu-row-dur">'+a(G)+"</span>":"")+'<span class="mu-row-ops"><button class="mu-addlist" data-list-remove="'+p+'" title="从歌单移除">'+d("X")+"</button></span></div>"}).join("")+"</div>"}else r='<div class="mu-empty">'+(n&&n.id===vn?"在搜索结果里点 ♡ 收藏喜欢的歌":"这个歌单还是空的")+"</div>";return'<div class="mu-panel"><div class="mu-list-head"><div class="mu-list-tabs">'+e+'</div><div class="mu-list-actions">'+Qt()+'<button class="mu-btn mini" id="muListImport" title="从分享链接导入歌单">'+d("Link")+'导入</button><button class="mu-btn mini" id="muListNew" title="新建歌单">'+d("Plus")+"新建</button>"+(n&&n.id!==vn?'<button class="mu-btn mini" id="muListRename" title="重命名歌单">'+d("Pencil")+'改名</button><button class="mu-btn mini danger" id="muListDel" title="删除此歌单">'+d("Trash2")+"删除</button>":"")+"</div></div>"+Ht(n)+r+"</div>"}function Ht(n){if(!An||!n||n.id!==An.listId)return"";var e=An.total?Math.round(An.done/An.total*100):0;return'<div class="mu-import-banner"><div class="mu-import-row"><span class="mu-spinner"></span><span class="mu-import-text">正在导入 '+An.done+"/"+An.total+' 首</span><span class="mu-import-pct">'+e+'%</span></div><div class="mu-import-track"><i style="width:'+e+'%"></i></div></div>'}var Se=!1;function Ot(){var n=!!window.LxMusic,e=n?window.LxMusic.listScripts():[],r=n?window.LxMusic.listLoaded():[],t={};e.forEach(function(R){t[R.name]=R});var u={},l=r.filter(function(R){return u[R.name]?!1:(u[R.name]=1,!0)}).map(function(R){var G=t[R.name];return'<div class="mu-src on"><b>'+a(R.name)+(G&&G.version?' <span class="mu-src-ver">'+a(G.version)+"</span>":"")+'</b><span class="mu-src-ops"><span class="mu-src-tag">已加载</span>'+(G?'<button class="mu-btn mini danger" data-lx-del="'+a(G.id)+'">删除</button>':"")+"</span></div>"}).join(""),p=e.filter(function(R){return!u[R.name]}).map(function(R){return'<div class="mu-src"><b>'+a(R.name)+(R.version?' <span class="mu-src-ver">'+a(R.version)+"</span>":"")+'</b><span class="mu-src-ops"><span class="mu-src-tag">未加载</span><button class="mu-btn mini danger" data-lx-del="'+a(R.id)+'">删除</button></span></div>'}).join("");l=l+p;var A=Object.keys(u).length,M="";return A?M='<p class="mu-note ok">已加载 '+A+" 个音源</p>":M='<p class="mu-note warn">还没有可用的音源，导入一个 .js 脚本才能播放</p>','<div class="mu-panel"><p class="mu-note">音源脚本只负责把歌名换成播放地址，搜索由内置的多平台接口完成。脚本只存在你本机浏览器，本站服务器不经手任何脚本内容。</p>'+M+'<div class="mu-btns"><button class="mu-btn primary" id="muLxPickFile">导入 .js 文件</button><button class="mu-btn" id="muLxPasteToggle">'+(Se?"收起粘贴框":"粘贴脚本导入")+'</button><input type="file" id="muLxFileInput" accept=".js,text/javascript" hidden></div>'+(Se?'<textarea class="mu-textarea mono" id="muLxCode" rows="6" placeholder="或直接粘贴脚本内容…"></textarea><div class="mu-btns"><button class="mu-btn primary" id="muLxAdd">保存并加载</button></div>':"")+(l?'<div class="mu-src-list">'+l+"</div>":'<div class="mu-empty">还没有导入音源脚本</div>')+"</div>"}function Gt(){var n=f&&i&&!f.paused,e=i&&i.cover,r=S.volume<=0,t=te(),u={one:"Repeat1",all:"Repeat",shuffle:"Shuffle"}[t],l={one:"单曲循环",all:"顺序播放",shuffle:"随机播放"}[t];return'<div class="mu-player"><div class="mu-bar"><span class="mu-time mu-time-cur">0:00</span><div class="mu-bar-progress"><i></i></div><input type="range" class="mu-seek" min="0" step="0.1" value="0"><span class="mu-time mu-time-dur">0:00</span></div><div class="mu-disc'+(n&&e?" spin":"")+'" id="muDisc" title="全屏播放">'+(e?'<img src="'+a(e)+'" alt="">':d("Play"))+(i&&i.loading?'<span class="mu-disc-spinner">'+d("Loader")+"</span>":"")+'</div><div class="mu-player-title">'+(i?a(i.title):"未在播放")+(i&&i.artist?" <i>· "+a(i.artist)+"</i>":"")+(i&&i.loading?'<span class="mu-loading-tip">正在加载…</span>':"")+'</div><div class="mu-ops mu-ops-main"><button class="mu-op" id="muPrev" title="上一首">'+d("SkipBack")+'</button><button class="mu-op big" id="muToggle" title="播放/暂停" data-morph="'+(n?"Pause":"Play")+'">'+d(n?"Pause":"Play")+'</button><button class="mu-op" id="muNext" title="下一首">'+d("SkipForward")+'</button></div><div class="mu-player-lyric" id="muBarLyric"></div><div class="mu-player-time"><span class="mu-pt-cur" id="muPtCur">0:00</span><span class="mu-pt-sep">/</span><span class="mu-pt-dur" id="muPtDur">0:00</span></div><div class="mu-ops mu-ops-side"><button class="mu-op'+(t!=="all"?" on":"")+'" id="muMode" title="'+l+'">'+d(u)+'</button><span class="mu-imm-vol"><button class="mu-op" id="muMute" title="'+(r?"取消静音":"静音")+'">'+d(r?"VolumeX":"Volume2")+'</button><span class="mu-imm-vol-pop"><span class="mu-imm-vol-num" id="muBarVolNum">'+Math.round(S.volume*100)+'</span><input type="range" class="mu-imm-vol-range mu-vol" min="0" max="1" step="0.01" value="'+S.volume+'" orient="vertical" aria-label="音量"></span></span><button class="mu-op'+(i&&Rn(vn,{track:i.track||i})?" on":"")+'" id="muBarLove" title="收藏">'+d("Heart")+'</button><button class="mu-op lyric-btn'+(Z?" on":"")+'" id="muBarLyricBtn" title="'+(Z?"隐藏歌词":"显示歌词")+'"><span class="mu-lyric-glyph'+(Z?"":" off")+'">词</span></button><button class="mu-op" id="muQueueBtn" title="当前播放列表">'+d("ListMusic")+'</button><button class="mu-op imm" id="muImmersive" title="全屏播放">'+d("Maximize2")+"</button></div></div>"}function te(){return S.shuffle?"shuffle":S.repeat==="one"?"one":"all"}function ze(){var n={one:"all",all:"shuffle",shuffle:"one"}[te()];S.shuffle=n==="shuffle",S.repeat=n==="one"?"one":"all",E(),z(),P({one:"单曲循环",all:"顺序播放",shuffle:"随机播放"}[n])}function Dt(){var n=[["search","搜索"],["rank","排行榜"],["lists","我的列表"],["script","音源"]];return'<div class="mu-wrap"><div class="mu-header"><div class="mu-mark">'+d("Play")+'</div><div class="mu-headtext"><h2 class="mu-title">我的音乐台</h2><p class="mu-sub">'+Me()+'</p></div></div><div class="mu-tabs">'+n.map(function(e){return'<button class="mu-tab'+(q===e[0]?" active":"")+'" data-mu-tab="'+e[0]+'">'+e[1]+"</button>"}).join("")+"</div>"+(q==="rank"?Kt():q==="search"?Rt():q==="lists"?Ft():Ot())+"</div>"}var X={ranks:null,openRank:null,songs:null,loading:!1};function Kt(){var n=X.ranks;if(n===null)return'<div class="mu-panel"><div class="mu-loading"><span class="mu-spinner"></span><span>正在加载排行榜…</span></div></div>';if(!n.length)return'<div class="mu-panel"><div class="mu-empty">排行榜加载失败，稍后再试</div></div>';var e=X.openRank,r=n.map(function(l){var p=e&&String(e.id)===String(l.id);return'<button class="mu-rank-side-item'+(p?" active":"")+'" data-rank="'+a(l.id)+'" data-rank-name="'+a(l.name)+'"><span class="mu-rank-side-art">'+(l.cover?'<img src="'+a(l.cover)+'" alt="" loading="lazy">':d("Trophy"))+'</span><span class="mu-rank-side-name">'+a(l.name)+"</span></button>"}).join(""),t;if(!e)t='<div class="mu-empty">选一个榜单看看</div>';else if(X.loading)t='<div class="mu-loading"><span class="mu-spinner"></span><span>正在加载榜单…</span></div>';else{var u=X.songs||[];t=u.length?'<div class="mu-rank-main-head"><h3>'+a(e.name)+"</h3><span>"+u.length+' 首</span></div><div class="mu-list">'+u.map(function(l,p){var A=Rn(vn,{track:l});return'<div class="mu-row" data-rank-play="'+p+'"><span class="mu-row-ico">'+(l.img?'<img src="'+a(l.img)+'" alt="" loading="lazy">':d("Play"))+'</span><span class="mu-row-main"><b>'+a(l.name)+"</b><i>"+a(l.singer)+'</i></span><span class="mu-row-ops"><button class="mu-love'+(A?" on":"")+'" data-rank-love="'+p+'" title="'+(A?"取消收藏":"收藏")+'">'+d("Heart")+'</button><button class="mu-addlist" data-rank-addlist="'+p+'" title="加入列表">'+d("ListPlus")+"</button></span>"+(l.interval?'<span class="mu-row-dur">'+a(l.interval)+"</span>":"")+"</div>"}).join("")+"</div>":'<div class="mu-empty">这个榜单暂时取不到歌曲</div>'}return'<div class="mu-panel"><div class="mu-rank-split"><div class="mu-rank-side">'+r+'</div><div class="mu-rank-main">'+t+"</div></div></div>"}function jt(){if(window.LxDiscover&&(!X.ranks||!X.ranks.length)&&!X.rankLoading){var n=Date.now();if(X.rankFailAt&&n-X.rankFailAt<3e4)return;X.rankLoading=!0,window.LxDiscover.listRanks().then(function(e){X.rankLoading=!1,X.rankFailAt=0,X.ranks=e&&e.length?e:[],X.ranks.length||(X.rankFailAt=Date.now()),q==="rank"&&z()}).catch(function(){X.rankLoading=!1,X.ranks=[],X.rankFailAt=Date.now(),q==="rank"&&z()})}}function zt(n,e){X.openRank={id:n,name:e},X.songs=null,X.loading=!0,z(),window.LxDiscover&&window.LxDiscover.rankSongs(n,1,60).then(function(r){!X.openRank||X.openRank.id!==n||(X.songs=r,X.loading=!1,z())})}function Wt(){var n=document.getElementById("muAddListMask");if(n&&n.remove(),!(_n<0)){var e=document.createElement("div");e.innerHTML=Nt();var r=e.firstElementChild;r&&document.body.appendChild(r)}}var ce=!1;function Me(){if(!window.LxMusic)return"音源未就绪";var n=window.LxMusic.listLoaded?window.LxMusic.listLoaded():[],e={};n.forEach(function(t){e[t.name]=1});var r=Object.keys(e).length;return r?"已加载 "+r+" 个音源":ce?"正在加载音源…":"未加载音源"}function Be(){var n=document.querySelector(".mu-sub");if(n&&(n.textContent=Me()),q==="search"){var e=document.querySelector(".mu-panel");if(e){var r=e.querySelector(".mu-note.warn"),t=!!(window.LxMusic&&window.LxMusic.hasSource());if(t&&r)r.remove();else if(!t&&!r){var u=document.createElement("p");u.className="mu-note warn",u.textContent="还没有可用的音源脚本。曲库负责搜到歌，播放地址需要音源脚本提供——去「音源」页导入一个。",e.insertBefore(u,e.firstChild)}}}if(q==="script"){var l=document.querySelector(".mu-panel .mu-note.ok, .mu-panel .mu-note.warn");l&&(l.outerHTML='<p class="mu-note '+(window.LxMusic&&window.LxMusic.hasSource()?"ok":"warn")+'">'+Me()+"</p>")}}function bn(){U&&document.getElementById("mod-music").classList.contains("active")&&z(),Pn()}function z(){if(U){var n=[];U.querySelectorAll("input[id], textarea[id]").forEach(function(t){t.type==="checkbox"||t.type==="radio"||n.push({id:t.id,value:t.value,focused:document.activeElement===t,selStart:t.selectionStart,selEnd:t.selectionEnd})}),U.innerHTML=Dt(),Yt(),Wt(),rr(),ln(),x(U),x(document.getElementById("muPlayerBar")),x(document.getElementById("muAddListMask")),n.forEach(function(t){if(t.id!=="muSearchKw"){var u="#"+(window.CSS&&CSS.escape?CSS.escape(t.id):t.id),l=U.querySelector(u);if(!(!l||l.value===t.value)&&(l.value=t.value,t.focused)){l.focus();try{l.setSelectionRange(t.selStart,t.selEnd)}catch{}}}});var e=n.filter(function(t){return t.id==="muSearchKw"})[0];if(e){var r=U.querySelector("#muSearchKw");r&&(r.value=e.value,e.focused&&(qe=!0,r.focus(),qe=!1))}}}function Yt(){var n=document.getElementById("muPlayerBar");n&&n.remove();var e=Gt(),r=document.createElement("div");r.innerHTML=e;var t=r.firstElementChild;t&&(t.id="muPlayerBar",document.body.appendChild(t),Xt(t),i&&(On(),i.loading&&Zn(!0)),En())}function En(){var n=document.getElementById("muPlayerBar");if(n){var e=document.getElementById("mod-music"),r=!!(e&&e.classList.contains("active"));n.style.display=r||O?"":"none",Pn()}}function On(){var n=document.getElementById("muPlayerBar");if(n){var e=n.querySelector(".mu-player-title");if(e)if(e.innerHTML=(i?a(i.title):"未在播放")+(i&&i.artist?" <i>· "+a(i.artist)+"</i>":""),i&&i.loading){var r=document.createElement("span");r.className="mu-loading-tip",r.textContent="正在加载…",e.appendChild(r),n.classList.add("loading")}else n.classList.remove("loading");var t=n.querySelector("#muDisc");if(t&&(t.innerHTML=i&&i.cover?'<img src="'+a(i.cover)+'" alt="">':d("Play"),x(t),i&&i.loading)){var u=document.createElement("span");u.className="mu-disc-spinner",u.innerHTML=d("Loader"),t.appendChild(u),x(u),n.classList.add("loading")}}}var We=new WeakMap;function Ye(n,e,r){if(!n||!window.MorphDOM||!window.LUCIDE_ICONS)return!1;var t=n.querySelector("svg");if(!t)return!1;var u=window.LUCIDE_ICONS[e],l=window.LUCIDE_ICONS[r];if(!u||!l||u.length!==1||l.length!==1||u[0][0]!=="path"||l[0][0]!=="path")return!1;try{var p=We.get(t);if(!p){for(;t.firstChild;)t.removeChild(t.firstChild);var A=document.createElementNS("http://www.w3.org/2000/svg","path"),M=u[0][1]||{};for(var R in M)A.setAttribute(R,M[R]);A.setAttribute("fill","none"),A.setAttribute("stroke","currentColor"),A.setAttribute("stroke-width","2"),A.setAttribute("stroke-linecap","round"),A.setAttribute("stroke-linejoin","round"),t.appendChild(A),p=window.MorphDOM.createMorph(A,u,{}),We.set(t,p)}return p.set(l),!0}catch{return!1}}function Re(n,e){n&&(n.innerHTML=d(e),x(n))}var Vt={Play:"PlayPath",Pause:"PausePath",Volume2:"VolumePath",VolumeX:"MutePath",Eye:"EyePath",EyeOff:"EyeOffPath",Heart:"HeartPath"};function Ae(n){return Vt[n]||n}function Zt(n){var e=document.getElementById("muPlayerBar"),r=e&&e.querySelector("#muToggle"),t=n?"Pause":"Play";if(r){var u=r.getAttribute("data-morph")||"Play";Ye(r,Ae(u),Ae(t))||Re(r,t),r.setAttribute("data-morph",t)}var l=O&&O.querySelector('[data-imm="toggle"]');if(l){var p=l.getAttribute("data-morph")||"Play";Ye(l,Ae(p),Ae(t))||Re(l,t),l.setAttribute("data-morph",t)}}function Ne(){var n=document.getElementById("muPlayerBar"),e=n&&n.querySelector("#muMute");if(e){var r=S.volume<=0,t=r?"VolumeX":"Volume2";Re(e,t),e.title=r?"取消静音":"静音"}}function Zn(n){var e=document.getElementById("muPlayerBar");if(e){e.classList.toggle("loading",!!n);var r=e.querySelector("#muDisc");if(r){var t=r.querySelector(".mu-disc-spinner");n?t||(t=document.createElement("span"),t.className="mu-disc-spinner",t.innerHTML=d("Loader"),r.appendChild(t),x(t)):t&&t.remove()}var u=e.querySelector(".mu-player-title");if(u){var l=u.querySelector(".mu-loading-tip");n?l||(l=document.createElement("span"),l.className="mu-loading-tip",l.textContent="正在加载…",u.appendChild(l)):l&&l.remove()}}}function Ve(n){!n||n._volWheelBound||(n._volWheelBound=!0,n.addEventListener("wheel",function(e){e.preventDefault(),e.stopPropagation();var r=(e.deltaY<0?1:-1)*.04;Mn(S.volume+r)},{passive:!1}))}function be(){if(O){var n=S.volume<=0,e=O.querySelector('[data-imm="mute"]');e&&(e.innerHTML=d(n?"VolumeX":"Volume2"),x(e),e.title=n?"取消静音":"静音");var r=O.querySelector(".mu-imm-vol-range");r&&document.activeElement!==r&&(r.value=String(S.volume));var t=O.querySelector("#muImmVolNum");t&&(t.textContent=String(Math.round(S.volume*100)))}}function Xt(n){var e=n.querySelector("#muToggle");e&&(e.onclick=V);var r=n.querySelector("#muPrev");r&&(r.onclick=hn);var t=n.querySelector("#muNext");t&&(t.onclick=function(){un(!1)});var u=n.querySelector("#muMode");u&&(u.onclick=ze);var l=n.querySelector("#muMute");l&&(l.onclick=function(){S.volume>0?(ne=S.volume,Mn(0)):Mn(ne>0?ne:.7),Ne()});var p=n.querySelector(".mu-seek");p&&(p.oninput=function(){on(parseFloat(p.value))});var A=n.querySelector("#muImmersive");A&&(A.onclick=nt);var M=n.querySelector("#muQueueBtn");M&&(M.onclick=Ze);var R=n.querySelector("#muBarLove");R&&(R.onclick=function(){if(!i){P("还没有在播的歌");return}var fn=ye({id:i.id,title:i.title,artist:i.artist,cover:i.cover||"",source:i.source||"",interval:i.interval||"",track:i.track||null});R.classList.toggle("on",fn);var tn=R.querySelector("svg");tn&&tn.classList.toggle("on",fn),P(fn?"已收藏":"已取消收藏")});var G=n.querySelector("#muBarLyricBtn");G&&(G.onclick=function(){Z=!Z;try{localStorage.setItem("juice_music_show_lyric",Z?"1":"0")}catch{}G.classList.toggle("on",Z),G.title=Z?"隐藏歌词":"显示歌词";var fn=G.querySelector(".mu-lyric-glyph");fn&&fn.classList.toggle("off",!Z);var tn=document.getElementById("muBarLyric");if(tn&&(tn.style.display=Z?"":"none"),Z||(oe=""),O){var Dn=O.querySelector("#muImmLyric"),$n=O.querySelector('[data-imm="lyric"]');if(Dn&&Dn.classList.toggle("hidden",!Z),$n){$n.classList.toggle("on",Z),$n.title=Z?"隐藏歌词":"显示歌词";var xe=$n.querySelector(".mu-lyric-glyph");xe&&xe.classList.toggle("off",!Z)}Z&&Dn&&(Dn.innerHTML=ve(),ue(Dn),Nn=-1,le(f?f.currentTime:0))}});var en=n.querySelector(".mu-vol");en&&(en.oninput=function(){Mn(parseFloat(en.value))}),Ve(n.querySelector(".mu-imm-vol"));var Tn=n.querySelector("#muDisc");Tn&&(Tn.onclick=nt,Tn.style.cursor="pointer")}var sn=null;function Ze(n){if(sn){Jn();return}if(!b.length){P("播放列表是空的");return}$t(n)}function $t(n){Jn(),sn=document.createElement("div"),sn.className="mu-queue-mask"+(n||O?" in-immersive":""),sn.innerHTML=nr(),document.body.appendChild(sn),x(sn),$e(sn),sn.querySelectorAll("[data-q-jump]").forEach(function(r){r.onclick=function(){var t=parseInt(r.getAttribute("data-q-jump"),10);if(isNaN(t)||t===h){Jn();return}h=t,F(),Gn()}});var e=sn.querySelector("#muQueueClear");e&&(e.onclick=function(){try{f.pause(),f.removeAttribute("src"),f.load()}catch{}i=null,b=[],h=-1,y="",o(),Jn(),Cn(!1),On(),En(),bn(),P("已清空播放列表")}),sn.querySelector(".mu-queue-close").onclick=Jn,sn.onclick=function(r){r.target===sn&&Jn()}}function Jn(){sn&&(sn.remove(),sn=null)}function Gn(n){if(sn){if(n){for(var e=sn.querySelectorAll(".mu-queue-row"),r=null,t=0;t<e.length;t++){var u=parseInt(e[t].getAttribute("data-q-index"),10)===h;e[t].classList.toggle("active",u),u&&(r=e[t])}r&&r.scrollIntoView({block:"center"});return}var l=sn.querySelector(".mu-queue-body");l&&(l.innerHTML=Xe()),x(sn),l&&$e(l),sn.querySelectorAll("[data-q-jump]").forEach(function(A){A.onclick=function(M){if(!(M.target.closest(".mu-queue-grip")||M.target.closest("[data-q-del]"))){var R=parseInt(A.getAttribute("data-q-jump"),10);if(isNaN(R)||R===h){Jn();return}h=R,F(),Gn()}}});var p=sn.querySelector(".mu-queue-row.active");p&&p.scrollIntoView({block:"center"})}}function nr(){return'<div class="mu-queue-panel"><div class="mu-queue-head"><div class="mu-queue-title"><b>当前播放</b><span>'+(y?a(y)+" · ":"")+b.length+' 首</span></div><div class="mu-queue-ops"><button class="mu-btn mini" id="muQueueClear" title="清空播放列表">'+d("Trash2")+'清空</button><button class="mu-op mu-queue-close" title="关闭">'+d("X")+'</button></div></div><div class="mu-queue-body">'+Xe()+"</div></div>"}function Xe(){return b.map(function(n,e){var r=e===h;return'<div class="mu-queue-row'+(r?" active":"")+'" data-q-jump="'+e+'" draggable="true" data-q-index="'+e+'"><span class="mu-queue-grip" title="拖动排序">'+d("GripVertical")+'</span><span class="mu-queue-idx">'+(r?d("Volume2"):e+1)+'</span><span class="mu-queue-text"><b>'+a(n.title||"未知曲目")+"</b>"+(n.artist?"<i>"+a(n.artist)+"</i>":"")+"</span>"+(n.interval?'<span class="mu-queue-dur">'+a(n.interval)+"</span>":"")+'<button class="mu-queue-del" data-q-del="'+e+'" title="从播放列表移除">'+d("X")+"</button></div>"}).join("")}var Xn=-1;function $e(n){n.querySelectorAll("[data-q-del]").forEach(function(r){r.addEventListener("click",function(t){t.stopPropagation();var u=parseInt(r.getAttribute("data-q-del"),10);er(u)})});var e=n.querySelectorAll("[data-q-index]");e.forEach(function(r){r.addEventListener("dragstart",function(t){Xn=parseInt(r.getAttribute("data-q-index"),10),r.classList.add("dragging");try{t.dataTransfer.effectAllowed="move",t.dataTransfer.setData("text/plain",String(Xn))}catch{}}),r.addEventListener("dragend",function(){r.classList.remove("dragging"),n.querySelectorAll(".drag-over").forEach(function(t){t.classList.remove("drag-over")})}),r.addEventListener("dragover",function(t){if(!(Xn<0)){t.preventDefault();try{t.dataTransfer.dropEffect="move"}catch{}r.classList.add("drag-over")}}),r.addEventListener("dragleave",function(){r.classList.remove("drag-over")}),r.addEventListener("drop",function(t){t.preventDefault(),r.classList.remove("drag-over");var u=parseInt(r.getAttribute("data-q-index"),10);Xn<0||isNaN(u)||Xn===u||(tr(Xn,u),Xn=-1)})})}function er(n){if(!(n<0||n>=b.length)){var e=n===h;if(b.splice(n,1),!b.length){try{f.pause(),f.removeAttribute("src"),f.load()}catch{}i=null,h=-1,y="",Zn(!1),Cn(!1),On(),En(),bn(),Jn(),o(),P("播放列表已清空");return}e?(h>=b.length&&(h=b.length-1),F()):n<h&&h--,o(),Gn(),q==="lists"&&z(),P("已从播放列表移除")}}function tr(n,e){if(!(n===e||n<0||e<0||n>=b.length||e>=b.length)){var r=b[h],t=b.splice(n,1)[0],u=n<e?e-1:e;b.splice(u,0,t);var l=b.indexOf(r);l>-1&&(h=l),o(),Gn()}}function rr(){U.querySelectorAll("[data-mu-tab]").forEach(function(w){w.onclick=function(){q=w.getAttribute("data-mu-tab"),_n=-1,pn=null,z()}}),U.querySelectorAll("[data-play]").forEach(function(w){w.onclick=function(H){if(!(H.target.closest("[data-love]")||H.target.closest("[data-addlist]"))){var Y=w.getAttribute("data-play"),j=parseInt(w.getAttribute("data-idx"),10),dn=Y==="本机文件"?me():Y==="直链歌单"?he():ee(),cn=dn[j];if(cn){var nn={kind:Y==="搜索结果"?"search":"local",id:cn.id||(cn.source||"")+"_"+(cn.songmid||cn.title),title:cn.title,artist:cn.artist||"",cover:cn.cover||"",url:cn.url||"",track:cn.track||null,source:cn.source||"",interval:cn.interval||""},Kn=b.length>0&&y&&y!==Y;if(Kn&&Y==="搜索结果"){N(nn);return}var Ir=dn.map(function(Ln){return{kind:Y==="搜索结果"?"search":"local",id:Ln.id||(Ln.source||"")+"_"+(Ln.songmid||Ln.title),title:Ln.title,artist:Ln.artist||"",cover:Ln.cover||"",url:Ln.url||"",track:Ln.track||null,source:Ln.source||"",interval:Ln.interval||""}});T(Ir,Y,j)}}}});var n=U.querySelector("#muPickFiles"),e=U.querySelector("#muFileInput");n&&e&&(n.onclick=function(){e.click()},e.onchange=function(){Ge(e.files)});var r=U.querySelector("#muPickFolder");r&&(r.onclick=De);var t=U.querySelector("#muRelink");t&&(t.onclick=kt);var u=U.querySelector("#muDrop");u&&(u.onclick=function(){e&&e.click()},["dragover","dragenter"].forEach(function(w){u.addEventListener(w,function(H){H.preventDefault(),u.classList.add("over")})}),["dragleave","drop"].forEach(function(w){u.addEventListener(w,function(H){H.preventDefault(),u.classList.remove("over")})}),u.addEventListener("drop",function(w){w.dataTransfer&&w.dataTransfer.files&&Ge(w.dataTransfer.files)}));var l=U.querySelector("#muJsonAdd"),p=U.querySelector("#muJsonIn");l&&p&&(l.onclick=function(){wt(p.value),p.value=""});var A=U.querySelector("#muJsonExample");A&&p&&(A.onclick=function(){p.value=It});var M=U.querySelector("#muJsonClear");M&&(M.onclick=function(){S.direct=[],E(),z(),P("直链歌单已清空")}),U.querySelectorAll("[data-builtin]").forEach(function(w){w.onclick=function(){S.src.builtin=w.getAttribute("data-builtin"),E(),z()}});var R=U.querySelector("#muJmKeySave"),G=U.querySelector("#muJmKey");R&&G&&(R.onclick=function(){S.src.jamendoKey=G.value.trim(),E(),P(S.src.jamendoKey?"Client ID 已保存":"Client ID 已清空")});var en=U.querySelector("#muLxAdd"),Tn=U.querySelector("#muLxCode"),fn=U.querySelector("#muLxPickFile"),tn=U.querySelector("#muLxFileInput"),Dn=U.querySelector("#muLxPasteToggle");Dn&&(Dn.onclick=function(){Se=!Se,z()});function $n(w){if(!window.LxMusic){P("音源内核未加载");return}at("导入音源脚本",`脚本由第三方编写，可在沙箱内向任意服务器发起网络请求。
请只导入可信来源的脚本，确定导入？`,function(){P("导入中…"),window.LxMusic.importScript(w).then(function(H){P("已导入："+H.name+"（"+H.sources.join("/")+"）"),z()}).catch(function(H){P("导入失败："+(H&&H.message?H.message:"unknown"))})})}en&&Tn&&(en.onclick=function(){var w=Tn.value;if(!w.trim()){P("先粘贴脚本内容");return}$n(w)}),fn&&tn&&(fn.onclick=function(){tn.click()},tn.onchange=function(){var w=tn.files&&tn.files[0];if(w){var H=new FileReader;H.onload=function(){$n(String(H.result||""))},H.onerror=function(){P("读取文件失败")},H.readAsText(w)}}),U.querySelectorAll("[data-lx-del]").forEach(function(w){w.onclick=function(H){H.stopPropagation(),window.LxMusic&&(window.LxMusic.removeScript(w.getAttribute("data-lx-del")),P("已删除"),z())}});var xe=U.querySelector("#muSearchBtn"),Un=U.querySelector("#muSearchKw"),mn=U.querySelector("#muSuggest"),Pe=null,lt=0;function we(){if(!mn||!Un)return;if(zn||qe){mn.hidden=!0,mn.innerHTML="";return}var w=Un.value.trim(),H=Tt(w),Y=++lt;function j(dn){if(Y===lt){var cn="";if(dn&&dn.length&&(cn+='<div class="mu-suggest-head">搜索建议</div>'+dn.map(function(nn){return'<div class="mu-suggest-item" data-sug="'+a(nn)+'">'+d("Search")+a(nn)+"</div>"}).join("")),!w&&H.length&&(cn+='<div class="mu-suggest-head mu-suggest-head-row">搜索历史<button class="mu-suggest-clear" id="muHistoryClear" title="清空搜索历史">清空</button></div>'+H.map(function(nn){return'<div class="mu-suggest-item" data-sug="'+a(nn)+'">'+d("History")+a(nn)+'<button class="mu-suggest-del" data-sug-del="'+a(nn)+'" title="删除这条">'+d("X")+"</button></div>"}).join("")),!cn){mn.hidden=!0,mn.innerHTML="";return}mn.innerHTML=cn,x(mn),mn.hidden=!1}}j([]),w&&(!window.LxMusic||!window.LxMusic.tipSearch||window.LxMusic.tipSearch(w).then(function(dn){j(dn)}).catch(function(){}))}Un&&(Un.oninput=function(){Pe&&clearTimeout(Pe),Pe=setTimeout(we,250)},Un.onfocus=we,Un.onkeydown=function(w){w.key==="Enter"?(mn&&(mn.hidden=!0),Qe(Un.value.trim())):w.key==="Escape"&&mn&&(mn.hidden=!0)});function Qe(w){w&&(mn&&(mn.hidden=!0,mn.innerHTML=""),qt(w),Mt(w))}xe&&Un&&(xe.onclick=function(){Qe(Un.value.trim())}),mn&&(mn.onclick=function(w){var H=w.target.closest("[data-sug-del]");if(H){w.stopPropagation();var Y=H.getAttribute("data-sug-del");S.history=S.history.filter(function(cn){return cn!==Y}),E(),we();return}if(w.target.closest("#muHistoryClear")){w.stopPropagation(),S.history=[],E(),we();return}var j=w.target.closest("[data-sug]");if(j){var dn=j.getAttribute("data-sug");Un&&(Un.value=dn),mn.hidden=!0,Qe(dn)}}),U.querySelectorAll("[data-love]").forEach(function(w){w.onclick=function(H){H.stopPropagation();var Y=parseInt(w.getAttribute("data-love"),10),j=ee()[Y];if(j){var dn=ye(j);P(dn?"已收藏":"已取消收藏"),z()}}}),U.querySelectorAll("[data-addlist]").forEach(function(w){w.onclick=function(H){H.stopPropagation(),_n=parseInt(w.getAttribute("data-addlist"),10),z()}});var Fe=document.getElementById("muAddListMask");Fe&&(Fe.onclick=function(w){w.target===Fe&&(_n=-1,pn=null,z())}),document.querySelectorAll("[data-pick-list]").forEach(function(w){w.onclick=function(){var H=w.getAttribute("data-pick-list"),Y=pn||ee()[_n];if(!Y){_n=-1,pn=null,pn=null,z();return}var j=Qn(H);if(!j){_n=-1,pn=null,z();return}Rn(H,Y)?P("已在「"+j.name+"」里"):(se(H,Y),P("已加入「"+j.name+"」")),_n=-1,pn=null,z()}});var dt=document.getElementById("muPickNew");dt&&(dt.onclick=function(){ie("新建歌单","歌单名称","",function(w){if(w){var H=ge(w),Y=pn||ee()[_n];H&&Y&&(se(H.id,Y),P("已加入「"+H.name+"」")),_n=-1,pn=null,z()}})});var xt=document.getElementById("muPickCancel");xt&&(xt.onclick=function(){_n=-1,pn=null,z()}),q==="rank"&&jt(),q==="rank"&&(U.querySelectorAll("[data-rank]").forEach(function(w){w.onclick=function(){zt(w.getAttribute("data-rank"),w.getAttribute("data-rank-name")||"")}}),U.querySelectorAll("[data-rank-play]").forEach(function(w){w.onclick=function(H){if(!(H.target.closest("[data-rank-love]")||H.target.closest("[data-rank-addlist]"))){var Y=parseInt(w.getAttribute("data-rank-play"),10),j=X.songs||[];if(j[Y]){var dn=X.openRank?X.openRank.name:"排行榜",cn=j.map(function(nn){return{kind:"rank",id:"kg_"+(nn.hash||nn.songmid),title:nn.name,artist:nn.singer,cover:nn.img||"",url:"",track:nn,source:"kg",interval:nn.interval}});T(cn,dn,Y)}}}}),U.querySelectorAll("[data-rank-love]").forEach(function(w){w.onclick=function(H){H.stopPropagation();var Y=parseInt(w.getAttribute("data-rank-love"),10),j=(X.songs||[])[Y];if(j){var dn={id:"kg_"+(j.hash||j.songmid),title:j.name,artist:j.singer,cover:j.img||"",source:"kg",interval:j.interval,track:j},cn=ye(dn);P(cn?"已收藏":"已取消收藏"),z()}}}),U.querySelectorAll("[data-rank-addlist]").forEach(function(w){w.onclick=function(H){H.stopPropagation();var Y=parseInt(w.getAttribute("data-rank-addlist"),10),j=(X.songs||[])[Y];if(j){var dn={id:"kg_"+(j.hash||j.songmid),title:j.name,artist:j.singer,cover:j.img||"",source:"kg",interval:j.interval,track:j};pn=dn,_n=0,z()}}})),U.querySelectorAll("[data-list-tab]").forEach(function(w){w.onclick=function(){kn=w.getAttribute("data-list-tab"),z()}}),U.querySelectorAll("[data-list-play]").forEach(function(w){w.onclick=function(H){if(!H.target.closest("[data-list-remove]")){var Y=parseInt(w.getAttribute("data-list-play"),10),j=Qn(kn);if(j){var dn=j.tracks[Y];if(dn){var cn=j.tracks.map(function(nn){var Kn=nn.track||nn;return{kind:"list",id:nn.id||(nn.source||Kn.source||"")+"_"+(Kn.songmid||nn.title),title:nn.title,artist:nn.artist||Kn.singer||"",cover:nn.cover||Kn.img||"",url:nn.url||"",track:nn.track||null,source:nn.source||Kn.source||"",interval:nn.interval||Kn.interval||""}});T(cn,j.name,Y)}}}}}),U.querySelectorAll("[data-list-remove]").forEach(function(w){w.onclick=function(H){H.stopPropagation();var Y=parseInt(w.getAttribute("data-list-remove"),10),j=Qn(kn);j&&(j.tracks.splice(Y,1),E(),z())}}),U.querySelectorAll("[data-src-filter]").forEach(function(w){w.onclick=function(){Yn=w.getAttribute("data-src-filter"),z()}});var ft=U.querySelector("#muListSort");ft&&(ft.onclick=function(){var w=["default","title","artist","added"];if(In==="default")In="title",Vn=!0;else if(Vn)Vn=!1;else{var H=w.indexOf(In),Y=w[(H+1)%w.length];In=Y,Vn=!0}z(),P("排序："+{default:"默认",title:"按字母",artist:"按歌手",added:"按加入时间"}[In]+(In==="default"?"":Vn?" 正序":" 倒序"))});var mt=U.querySelector("#muListImport");mt&&(mt.onclick=ur);var ht=U.querySelector("#muListNew");ht&&(ht.onclick=function(){ie("新建歌单","歌单名称","",function(w){if(w){var H=ge(w);H&&(kn=H.id,z())}})});var _t=U.querySelector("#muListRename");_t&&(_t.onclick=function(){var w=Qn(kn);w&&ie("重命名歌单","歌单名称",w.name,function(H){!H||H===w.name||(w.name=H,E(),z(),P("已改名为「"+H+"」"))})});var pt=U.querySelector("#muListDel");pt&&(pt.onclick=function(){var w=Qn(kn);w&&at("删除歌单","确定删除「"+w.name+"」？此操作不可撤销。",function(){Ct(w.id),kn=vn,z(),P("已删除")})})}var O=null;function ve(){if(!Z)return"";if(!i)return'<div class="mu-imm-lyric-tip">当前没有在播放的歌</div>';if(!yn)return'<div class="mu-imm-lyric-tip">歌词加载中…</div>';var n=yn.parsed||[];return n.length?'<span class="mu-lyr-pad"></span>'+n.map(function(e,r){return'<p class="mu-imm-lyric-line" data-line="'+r+'" data-time="'+e.time+'">'+a(e.text)+"</p>"}).join("")+'<span class="mu-lyr-pad"></span>':'<div class="mu-imm-lyric-tip">'+(yn.pending?"歌词加载中…（这首歌要跨平台找）":"暂无歌词")+"</div>"}function ke(n){if(!n){yn=null,Hn="";return}if(n.kind==="local"||n.kind==="link"){yn=null,Hn="";return}var e=(n.source||"")+"|"+(n.id||n.title||"");if(e!==Hn&&(Hn=e,yn=null,!!window.LxLyric)){var r=setTimeout(function(){e!==Hn||yn||(yn={parsed:[],pending:!0},Ie())},8e3);window.LxLyric.getLyric(n).then(function(t){clearTimeout(r),e===Hn&&(yn=t,Ie())}).catch(function(){clearTimeout(r),e===Hn&&(yn={parsed:[]},Hn="",Ie())})}}function Ie(){if(O){var n=O.querySelector("#muImmLyric");n&&(n.innerHTML=ve(),ue(n),Nn=-1,le(f?f.currentTime:0))}}function ue(n){var e=n.querySelectorAll(".mu-lyr-pad");if(e.length)for(var r=Math.max(0,n.clientHeight/2-24),t=0;t<e.length;t++)e[t].style.height=r+"px"}var Nn=-1;function le(n){if(!(!O||!yn)){var e=yn.parsed||[];if(e.length){for(var r=0,t=e.length-1,u=-1;r<=t;){var l=r+t>>1;e[l].time<=n?(u=l,r=l+1):t=l-1}if(u!==Nn){Nn=u;var p=O.querySelector("#muImmLyric");if(p){for(var A=p.querySelectorAll(".mu-imm-lyric-line"),M=0;M<A.length;M++)A[M].classList.toggle("active",M===u),A[M].classList.toggle("passed",M<u);var R=A[u];if(R){var G=R.offsetTop-p.clientHeight/2+R.offsetHeight/2;ar(p,Math.max(0,G))}}}}}}var re=0;function ar(n,e){re&&(clearTimeout(re),re=0);var r=n.scrollTop,t=e-r;if(!(Math.abs(t)<1)){var u=Math.min(520,260+Math.abs(t)*.35),l=performance.now(),p=function(R){return R<.5?4*R*R*R:1-Math.pow(-2*R+2,3)/2},A=!1,M=function(){if(!A){var R=performance.now(),G=Math.min(1,(R-l)/u);n.scrollTop=r+t*p(G),G<1?re=setTimeout(M,16):(A=!0,re=0)}};re=setTimeout(M,16)}}function nt(){ae();try{var n=localStorage.getItem("juice_music_show_lyric");n!==null&&(Z=n==="1")}catch{}O=document.createElement("div"),O.className="mu-immersive",O.innerHTML=ir(),document.body.appendChild(O),x(O),or(),Cn(f&&!f.paused),ln(),sr(),Nn=-1,ke(i);var e=O.querySelector("#muImmLyric");e&&ue(e),setTimeout(function(){if(O){var r=O.querySelector("#muImmLyric");r&&ue(r),Nn=-1,le(f?f.currentTime:0)}},60)}function ir(){for(var n=f&&i&&!f.paused,e="",r=0;r<24;r++)e+='<i style="--d:'+(r*.08).toFixed(2)+'s"></i>';return'<div class="mu-imm-bg"></div><div class="mu-imm-inner"><div class="mu-imm-left"><div class="mu-imm-deck"><div class="mu-imm-vinyl'+(n&&!(i&&i.cover)?" spin":"")+'"><span class="mu-imm-grooves"></span><div class="mu-imm-disc'+(n&&i&&i.cover?" spin":"")+'">'+(i&&i.cover?'<img src="'+a(i.cover)+'" alt="">':d("Play"))+'</div><span class="mu-imm-hole"></span></div></div><div class="mu-imm-bars'+(n?" on":"")+'">'+e+'</div><div class="mu-imm-title">'+(i?a(i.title):"未在播放")+'</div><div class="mu-imm-artist">'+(i&&i.artist?a(i.artist):"我的音乐台")+'</div></div><div class="mu-imm-lyric'+(Z?"":" hidden")+'" id="muImmLyric">'+ve()+'</div><div class="mu-imm-foot"><div class="mu-bar imm"><span class="mu-time mu-time-cur">0:00</span><div class="mu-bar-progress"><i></i></div><input type="range" class="mu-seek" min="0" step="0.1" value="0"><span class="mu-time mu-time-dur">0:00</span></div><div class="mu-ops imm"><div class="mu-imm-ops-left"><button class="mu-op lyric-btn'+(Z?" on":"")+'" data-imm="lyric" title="'+(Z?"隐藏歌词":"显示歌词")+'"><span class="mu-lyric-glyph'+(Z?"":" off")+'">词</span></button><button class="mu-op" data-imm="queue" title="播放列表">'+d("ListMusic")+'</button><button class="mu-op'+(i&&Rn(vn,{track:i.track||i})?" on":"")+'" data-imm="love" title="收藏">'+d("Heart")+'</button></div><div class="mu-imm-ops-center"><button class="mu-op" data-imm="prev" title="上一首">'+d("SkipBack")+'</button><button class="mu-op big" data-imm="toggle" title="播放/暂停" data-morph="'+(n?"Pause":"Play")+'">'+d(n?"Pause":"Play")+'</button><button class="mu-op" data-imm="next" title="下一首">'+d("SkipForward")+'</button></div><div class="mu-imm-ops-right"><button class="mu-op'+(te()!=="all"?" on":"")+'" data-imm="mode" title="'+{one:"单曲循环",all:"顺序播放",shuffle:"随机播放"}[te()]+'">'+d({one:"Repeat1",all:"Repeat",shuffle:"Shuffle"}[te()])+'</button><span class="mu-imm-vol"><button class="mu-op" data-imm="mute" title="'+(S.volume<=0?"取消静音":"静音")+'">'+d(S.volume<=0?"VolumeX":"Volume2")+'</button><span class="mu-imm-vol-pop"><span class="mu-imm-vol-num" id="muImmVolNum">'+Math.round(S.volume*100)+'</span><input type="range" class="mu-imm-vol-range" min="0" max="1" step="0.01" value="'+S.volume+'" orient="vertical" aria-label="音量"></span></span><button class="mu-op" data-imm="exit" title="退出全屏（Esc）">'+d("Minimize2")+"</button></div></div></div></div>"}function or(){O.querySelector('[data-imm="prev"]').onclick=hn,O.querySelector('[data-imm="next"]').onclick=function(){un(!1)},O.querySelector('[data-imm="toggle"]').onclick=V,O.querySelector('[data-imm="exit"]').onclick=ae;var n=O.querySelector(".mu-imm-vol-range");n&&(n.oninput=function(){Mn(parseFloat(n.value)),be()}),Ve(O.querySelector(".mu-imm-vol"));var e=O.querySelector('[data-imm="mute"]');e&&(e.onclick=function(){S.volume>0?(ne=S.volume,Mn(0)):Mn(ne>0?ne:.7),be()});var r=O.querySelector('[data-imm="love"]');r&&(r.onclick=function(){if(i){var p={id:i.id,title:i.title,artist:i.artist,cover:i.cover||"",source:i.source||"",interval:i.interval||"",track:i.track||null},A=ye(p);r.classList.toggle("on",A),r.querySelector("svg")?.classList.toggle("on",A),P(A?"已收藏":"已取消收藏")}});var t=O.querySelector('[data-imm="queue"]');t&&(t.onclick=function(){Ze(!0)});var u=O.querySelector('[data-imm="mode"]');u&&(u.onclick=function(){ze();var p=te(),A=O.querySelector('[data-imm="mode"]');A&&(A.innerHTML=d({one:"Repeat1",all:"Repeat",shuffle:"Shuffle"}[p]),x(A),A.classList.toggle("on",p!=="all"),A.title={one:"单曲循环",all:"顺序播放",shuffle:"随机播放"}[p])}),O.querySelector('[data-imm="lyric"]').onclick=function(){Z=!Z;try{localStorage.setItem("juice_music_show_lyric",Z?"1":"0")}catch{}var p=O.querySelector("#muImmLyric");p&&p.classList.toggle("hidden",!Z),this.classList.toggle("on",Z),this.title=Z?"隐藏歌词":"显示歌词";var A=this.querySelector(".mu-lyric-glyph");A&&A.classList.toggle("off",!Z),Z&&(p.innerHTML=ve(),ue(p),Nn=-1,le(f?f.currentTime:0))};var l=O.querySelector(".mu-seek");l.oninput=function(){on(parseFloat(l.value))},O.addEventListener("click",function(p){(p.target===O||p.target.classList.contains("mu-imm-bg"))&&ae()})}function et(){return!!(document.fullscreenElement||document.webkitFullscreenElement)}function sr(){var n=document.documentElement,e=n.requestFullscreen||n.webkitRequestFullscreen;if(e)try{var r=e.call(n);r&&r.catch&&r.catch(function(){})}catch{}}function cr(){if(et()){var n=document.exitFullscreen||document.webkitExitFullscreen;if(n)try{var e=n.call(document);e&&e.catch&&e.catch(function(){})}catch{}}}function ae(){O&&(O.remove(),O=null,cr(),Jn(),En())}var wn=null;function tt(){wn||(wn=document.createElement("div"),wn.className="mu-mini",wn.style.display="none",document.body.appendChild(wn))}function Pn(){if(tt(),!i){wn.style.display="none";return}var n=U&&document.getElementById("mod-music").classList.contains("active"),e=!(n||O);if(wn.style.display=e?"flex":"none",!!e){var r=f&&!f.paused;wn.innerHTML='<span class="mu-mini-dot'+(r?" on":"")+'"></span><span class="mu-mini-title">'+a(i.title)+'</span><button class="mu-mini-btn" data-mini="toggle" title="播放/暂停">'+d(r?"Pause":"Play")+'</button><button class="mu-mini-btn" data-mini="next" title="下一首">'+d("SkipForward")+'</button><button class="mu-mini-btn" data-mini="goto" title="打开播放器">'+d("Maximize2")+'</button><button class="mu-mini-btn" data-mini="stop" title="停止">'+d("X")+"</button>",x(wn),wn.querySelectorAll("[data-mini]").forEach(function(t){t.onclick=function(u){u.stopPropagation();var l=t.getAttribute("data-mini");if(l==="toggle")V();else if(l==="next")un(!1);else if(l==="goto")window.AppRouter&&window.AppRouter.navigate("music","home");else if(l==="stop"){try{f.pause(),f.removeAttribute("src"),f.load()}catch{}i=null,b=[],h=-1,o(),wn.style.display="none",bn()}}}),wn.onclick=function(){window.AppRouter&&window.AppRouter.navigate("music","home")}}}function Cn(n){var e=document.getElementById("muPlayerBar");Zt(!!n);var r=e&&e.querySelector("#muDisc");r&&r.classList.toggle("spin",!!n);var t=document.querySelectorAll(".mu-imm-title");t.forEach(function(R){i&&(R.textContent=i.title)});var u=document.querySelectorAll(".mu-imm-artist");if(u.forEach(function(R){i&&(R.textContent=i.artist||"我的音乐台")}),O){var l=O.querySelector(".mu-imm-vinyl"),p=O.querySelector(".mu-imm-disc"),A=O.querySelector(".mu-imm-bars"),M=!!(i&&i.cover);l&&l.classList.toggle("spin",!!n&&!M),p&&p.classList.toggle("spin",!!n&&M),A&&A.classList.toggle("on",!!n)}if(Pn(),"mediaSession"in navigator)try{navigator.mediaSession.playbackState=n?"playing":"paused"}catch{}}var rt=null;function P(n){var e=document.querySelector(".mu-toast");e||(e=document.createElement("div"),e.className="mu-toast",document.body.appendChild(e)),e.textContent=n,e.classList.add("show"),clearTimeout(rt),rt=setTimeout(function(){e.classList.remove("show")},2200)}var xn=null;function ie(n,e,r,t,u){qn(),u=u||{},xn=document.createElement("div"),xn.className="mu-modal-mask",xn.innerHTML='<div class="mu-modal-box mu-ask-box"><h4 class="mu-modal-title">'+a(n)+"</h4>"+(u.hint?'<p class="mu-ask-hint">'+a(u.hint)+"</p>":"")+(u.multiline?'<textarea class="mu-textarea mu-ask-input" id="muAskInput" rows="6" placeholder="'+a(e)+'">'+a(r||"")+"</textarea>":'<input class="mu-input mu-ask-input" id="muAskInput" placeholder="'+a(e)+'" value="'+a(r||"")+'" maxlength="30">')+'<div class="mu-modal-ops"><button class="mu-btn" id="muAskCancel">取消</button><button class="mu-btn primary" id="muAskOk">确定</button></div></div>',document.body.appendChild(xn);var l=xn.querySelector("#muAskInput"),p=function(){var A=l.value.trim();qn(),t(A)};xn.querySelector("#muAskOk").onclick=p,xn.querySelector("#muAskCancel").onclick=qn,xn.onclick=function(A){A.target===xn&&qn()},l.onkeydown=function(A){if(A.key==="Escape"){A.preventDefault(),qn();return}A.key==="Enter"&&(!u.multiline||A.ctrlKey||A.metaKey)&&(A.preventDefault(),p())},setTimeout(function(){l.focus(),u.multiline||l.select()},30)}function qn(){xn&&(xn.remove(),xn=null)}function at(n,e,r){qn(),xn=document.createElement("div"),xn.className="mu-modal-mask",xn.innerHTML='<div class="mu-modal-box mu-ask-box"><h4 class="mu-modal-title">'+a(n)+'</h4><p class="mu-ask-hint">'+a(e)+'</p><div class="mu-modal-ops"><button class="mu-btn" id="muAskCancel">取消</button><button class="mu-btn danger" id="muAskOk">确定</button></div></div>',document.body.appendChild(xn),xn.querySelector("#muAskOk").onclick=function(){qn(),r()},xn.querySelector("#muAskCancel").onclick=qn,xn.onclick=function(t){t.target===xn&&qn()}}function ur(){ie("导入歌单","粘贴歌单分享链接，或一行一首「歌名 - 歌手」","",function(n){if(n){var e=lr(n);if(e){P("正在读取「"+e.platform+"」歌单…"),dr(e).then(function(u){if(!u||!u.tracks.length){P("歌单读取失败："+(u&&u.error||"没有取到歌曲"));return}var l=u.name||"导入 "+new Date().toLocaleDateString("zh-CN");ie("命名歌单","歌单名称",l,function(p){var A=ge(p||l);A&&_r(u.tracks,A)})});return}var r=pr(n);if(!r.length){P("没识别到歌单链接或歌曲，试试粘贴分享链接");return}var t="导入 "+new Date().toLocaleDateString("zh-CN");ie("命名歌单","歌单名称",t,function(u){var l=ge(u||t);l&&gr(r,l)})}},{multiline:!0,hint:"支持网易云 / QQ音乐 / 酷狗 / 酷我 的歌单分享链接；也可以一行一首「歌名 - 歌手」"})}function lr(n){var e=String(n||""),r=e.match(/music\.163\.com\/(?:[a-z]+\/)?(?:playlist|discover)?[^\s]*?[?&#]id=(\d+)/i)||e.match(/music\.163\.com\/(?:m\/)?playlist\/(\d+)/i);if(r)return{platform:"网易云音乐",kind:"wy",id:r[1]};var t=e.match(/(?:[a-z0-9]+\.)?y\.qq\.com\/n\/ryqq\/playlist\/(\d+)/i)||e.match(/(?:[a-z0-9]+\.)?y\.qq\.com\/[^\s]*?playlist[^\s]*?[?&]id=(\d+)/i)||e.match(/(?:[a-z0-9]+\.)?y\.qq\.com\/[^\s]*?[?&]disstid=(\d+)/i)||e.match(/(?:[a-z0-9]+\.)?y\.qq\.com\/[^\s]*?[?&]id=(\d+)/i);if(t)return{platform:"QQ音乐",kind:"tx",id:t[1]};var u=e.match(/kugou\.com\/yy\/special\/single\/(\d+)/i)||e.match(/kugou\.com\/plist\/list\/(\d+)/i)||e.match(/kugou\.com\/[^\s]*?specialid=(\d+)/i);if(u)return{platform:"酷狗音乐",kind:"kg",id:u[1]};var l=e.match(/kuwo\.cn\/playlist_detail\/(\d+)/i)||e.match(/kuwo\.cn\/[^\s]*?playlistId=(\d+)/i);return l?{platform:"酷我音乐",kind:"kw",id:l[1]}:null}function dr(n){return n.kind==="wy"?mr(n.id):n.kind==="tx"?xr(n.id):Promise.resolve({name:"",tracks:[],error:n.platform+" 歌单暂未支持，请改用文本导入"})}function xr(n){var e={req_1:{module:"music.srfDissInfo.aiDissInfo",method:"uniform_get_Dissinfo",param:{disstid:Number(n),enc_host_uin:"",tag:1,userinfo:1,is_pc:1}},comm:{ct:24,cv:0}},r="https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&data="+encodeURIComponent(JSON.stringify(e));return window.LxRequest.httpFetch(r,{timeout:15e3}).promise.then(function(t){var u=t&&t.body&&t.body.req_1&&t.body.req_1.data;if(!u)return{name:"",tracks:[],error:"歌单不存在或已设为私密"};var l=(u.songlist||[]).map(fr).filter(function(A){return A.title}),p=u.dirinfo||{};return{name:p.title||u.dissname||"",cover:p.picurl||"",tracks:l,error:l.length?"":"歌单里没有歌曲"}}).catch(function(t){return{name:"",tracks:[],error:t&&t.message||"网络错误"}})}function fr(n){var e=n.singer||[],r=n.album||{},t=r.picurl||r.picUrl||(r.mid?"https://y.gtimg.cn/music/photo_new/T002R300x300M000"+r.mid+".jpg":"");return{title:String(n.name||n.title||"").trim(),artist:e.map(function(u){return u.name}).filter(Boolean).join("、"),cover:t,interval:n.interval?_(n.interval):""}}function mr(n){var e="https://music.163.com/api/v6/playlist/detail?id="+encodeURIComponent(n);return window.LxRequest.httpFetch(e,{timeout:1e4,headers:{Referer:"https://music.163.com/"}}).promise.then(function(r){var t=r&&r.body&&r.body.playlist;if(!t)return{name:"",tracks:[],error:"歌单不存在或已设为私密"};var u=(t.trackIds||[]).map(function(p){return p.id}),l=(t.tracks||[]).map(function(p){return it(p)});return u.length?hr(u).then(function(p){return{name:t.name,cover:t.coverImgUrl||"",tracks:p.length?p:l}}):{name:t.name,tracks:l}}).catch(function(r){return{name:"",tracks:[],error:r&&r.message||"网络错误"}})}function hr(n){for(var e=200,r=[],t=0;t<n.length;t+=e)r.push(n.slice(t,t+e));return Promise.all(r.map(function(u){var l="ids="+encodeURIComponent(JSON.stringify(u))+"&c="+encodeURIComponent(JSON.stringify(u.map(function(p){return{id:p}})));return window.LxRequest.httpFetch("https://music.163.com/api/song/detail",{method:"post",body:l,timeout:15e3,headers:{"Content-Type":"application/x-www-form-urlencoded",Referer:"https://music.163.com/"}}).promise.then(function(p){var A=p&&p.body&&p.body.songs||[];return A.map(it).filter(function(M){return M.title})}).catch(function(){return[]})})).then(function(u){var l={};return u.forEach(function(p){p.forEach(function(A){A.wyId&&(l[A.wyId]=A)})}),n.map(function(p){return l[p]}).filter(Boolean)})}function it(n){var e=n.ar||n.artists||[],r=n.al||n.album||{};return{title:String(n.name||"").trim(),artist:e.map(function(t){return t.name}).filter(Boolean).join("、"),cover:r.picUrl||"",wyId:n.id,interval:n.dt?_(n.dt/1e3):n.duration?_(n.duration/1e3):""}}function _r(n,e){var r=n.length;if(!r)return P("歌单里没有歌曲"),Promise.resolve();if(An&&An.running)return P("已有歌单正在导入，等它完成再试"),Promise.resolve();kn=e.id;var t=An={listId:e.id,done:0,total:r,added:0,failed:0,running:!0};z();var u=4,l=0;function p(){if(l>=r)return Promise.resolve();var R=n[l++];return window.LxMusic.search((R.title+" "+R.artist).trim(),1).then(function(G){var en=ot(G.list||[],{title:R.title,artist:R.artist});en?Rn(e.id,{track:en})||(se(e.id,{id:en.source+"_"+en.songmid,title:en.name,artist:en.singer,cover:en.img||R.cover||"",source:en.source,interval:en.interval,track:en}),t.added++):t.failed++}).catch(function(){t.failed++}).then(function(){if(t.done++,q==="lists"&&kn===e.id){var G=Date.now();(!t.lastRender||G-t.lastRender>500)&&(t.lastRender=G,z())}return p()})}for(var A=[],M=0;M<u;M++)A.push(p());return Promise.all(A).then(function(){var R=e.tracks.length,G=t.failed;An===t&&(An=null),z(),P("导入完成：成功 "+R+" 首"+(G?"，未匹配 "+G+" 首":""))}).catch(function(R){An===t&&(An=null),z(),P("导入中断："+(R&&R.message||"unknown"))})}function pr(n){var e=[],r={};return String(n).split(/\r?\n/).forEach(function(t){var u=t.trim();if(u&&(u=u.replace(/^[\s·•\-—*>#\d.、]+/,"").replace(/[《》「」“”"]/g,"").replace(/\s*(分享|来自|复制链接|打开\S*APP|https?:\/\/\S+)\s*/g," ").trim(),!(!u||u.length>80))){var l="",p="",A=u.match(/^(.+?)\s*[-–—]\s*(.+)$/);if(A)l=A[1].trim(),p=A[2].trim();else{var M=u.match(/^(.+?)\s*[·|]\s*(.+)$/);M?(l=M[2].trim(),p=M[1].trim()):l=u}if(l=l.replace(/\s+/g," ").trim(),p=p.replace(/\s+/g," ").trim(),!(!l||l.length<1)){var R=(l+"|"+p).toLowerCase();r[R]||(r[R]=1,e.push({title:l,artist:p}))}}}),e.slice(0,100)}function gr(n,e){if(!window.LxMusic){P("音源未就绪");return}var r=0,t=0,u=0;P("开始导入 "+n.length+" 首…");var l=Promise.resolve();n.forEach(function(p,A){l=l.then(function(){var M=(p.title+" "+p.artist).trim();return window.LxMusic.search(M,1).then(function(R){var G=ot(R.list||[],p);G&&!Rn(e.id,{track:G})?(se(e.id,{id:G.source+"_"+G.songmid,title:G.name,artist:G.singer,cover:G.img||"",source:G.source,interval:G.interval,track:G}),t++):G||u++}).catch(function(){u++}).then(function(){r++,(r%5===0||r===n.length)&&P("导入中 "+r+"/"+n.length+"（成功 "+t+"）")})})}),l.then(function(){kn=e.id,z(),P("导入完成：成功 "+t+" 首"+(u?"，失败 "+u+" 首":""))})}function ot(n,e){if(!n.length)return null;for(var r=e.title.toLowerCase(),t=e.artist.toLowerCase(),u=null,l=null,p=0;p<n.length;p++){var A=n[p],M=String(A.name||"").toLowerCase(),R=String(A.singer||"").toLowerCase(),G=M===r,en=!t||R.indexOf(t)>-1;if(G&&en){u=A;break}!l&&G&&(l=A)}return u||l||null}function yr(n){var e=document.getElementById("mod-music").classList.contains("active"),r=!!O,t=!!document.getElementById("muAddListMask");if(!(!e&&!r&&!t)&&!/INPUT|TEXTAREA/.test(n.target&&n.target.tagName||"")){if(n.key==="Escape"&&t){_n=-1,pn=null,document.getElementById("muAddListMask").remove();return}if(!(!e&&!r))if(n.code==="Space")n.preventDefault(),V();else if(n.key==="ArrowRight"&&f){var u=f.duration?f.currentTime:rn?rn.pos:0;on(u+5)}else if(n.key==="ArrowLeft"&&f){var l=f.duration?f.currentTime:rn?rn.pos:0;on(l-5)}else n.key==="ArrowUp"?(n.preventDefault(),Mn(S.volume+.05)):n.key==="ArrowDown"?(n.preventDefault(),Mn(S.volume-.05)):n.key==="Escape"&&r&&ae()}}var st=!1,de=!1,rn=null;function Sr(){if(!st){st=!0;var n=s();if(n){de=!0;try{Ar(n)}finally{setTimeout(function(){de=!1},1200)}}}}function Ar(n){var e=[];if(b=n.queue.map(function(l,p){return l.kind==="local"&&/^blob:/.test(l.url||"")?null:(e.push(p),l)}).filter(Boolean),!b.length){ct();return}y=n.name||"";var r=e.indexOf(n.qi);if(h=r>=0?r:typeof n.qi=="number"&&n.qi>=0&&n.qi<b.length?n.qi:0,i=b[h],!i){ct();return}b.forEach(function(l){l.kind!=="link"&&(l.url="")});var t=Math.max(0,Number(n.pos)||0);C=t,$=Math.floor(t),t>0&&(rn={id:i.id,pos:t});var u=n.at&&Date.now()-n.at>6*3600*1e3;u&&(rn=null),fe(),Cn(!1),On(),En(),bn(),Pn(),ke(i),an(i)}function ct(){try{localStorage.removeItem(B)}catch{}try{localStorage.removeItem(g)}catch{}m=""}function br(){if(U=document.getElementById("muRoot"),!!U){if(Q(),!D){D=!0,document.addEventListener("keydown",yr),window.addEventListener("hashchange",function(){_n=-1,pn=null;var l=document.getElementById("muAddListMask");l&&l.remove(),setTimeout(En,60),setTimeout(En,400)});var n=function(){f&&!f.paused&&isFinite(f.currentTime)&&f.currentTime>0&&(C=Math.floor(f.currentTime)),o()};window.addEventListener("pagehide",n),document.addEventListener("visibilitychange",function(){document.visibilityState==="hidden"&&n()});var e=function(){!et()&&O&&ae()};document.addEventListener("fullscreenchange",e),document.addEventListener("webkitfullscreenchange",e);var r=document.getElementById("mod-music");if(r&&window.MutationObserver&&new MutationObserver(En).observe(r,{attributes:!0,attributeFilter:["class"]}),document.addEventListener("click",function(l){var p=document.getElementById("muSuggest");if(!(!p||p.hidden)){var A=document.getElementById("muSearchKw");p.contains(l.target)||A&&A.contains(l.target)||(p.hidden=!0)}}),L(),tt(),Sr(),window.LxMusic){ce=!0;var t=!1,u=setInterval(function(){Be();var l=window.LxMusic.listLoaded().length;l>0&&(ce=!1),l>0&&!t&&(t=!0,q==="search"&&z())},800);window.LxMusic.loadBuiltinScripts().then(function(){return window.LxMusic.loadSavedScripts()}).then(function(){clearInterval(u),ce=!1,Be(),(q==="script"||q==="search")&&z(),Pn()}).catch(function(l){clearInterval(u),ce=!1,Be(),console.warn("[LxMusic] 音源加载失败",l)})}}z(),ut()}}function ut(){rn&&ln()}function vr(){z(),ut()}function kr(){ae(),qn(),Jn(),_n=-1,pn=null;var n=document.getElementById("muAddListMask");n&&n.remove(),Pn()}window.AppMusic={init:br,restoreView:vr,destroy:kr}})();

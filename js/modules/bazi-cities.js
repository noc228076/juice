/**
 * 全中国 34 个省级行政区 + 港澳台 + 海外主要城市 完整经度数据库
 * 覆盖 370+ 地级市与重点区县，用于真太阳时（True Solar Time）经度偏差精准校准
 * 基准时间：北京时间 (东经 120°E)，经度每差 1°，时差偏差 4 分钟
 */
(function() {
  'use strict';

  const CHINA_PROVINCES = [
    {
      province: '北京市',
      cities: [
        { name: '北京 (市中心)', lng: 116.40 },
        { name: '海淀区', lng: 116.30 },
        { name: '朝阳区', lng: 116.44 },
        { name: '丰台区', lng: 116.29 },
        { name: '通州区', lng: 116.66 },
        { name: '昌平区', lng: 116.23 },
        { name: '大兴区', lng: 116.34 },
        { name: '顺义区', lng: 116.65 },
        { name: '房山区', lng: 116.14 },
        { name: '门头沟区', lng: 116.10 },
        { name: '平谷区', lng: 117.12 },
        { name: '怀柔区', lng: 116.63 },
        { name: '密云区', lng: 116.84 },
        { name: '延庆区', lng: 115.98 }
      ]
    },
    {
      province: '上海市',
      cities: [
        { name: '上海 (市中心)', lng: 121.47 },
        { name: '浦东新区', lng: 121.54 },
        { name: '徐汇区', lng: 121.44 },
        { name: '闵行区', lng: 121.38 },
        { name: '宝山区', lng: 121.49 },
        { name: '嘉定区', lng: 121.27 },
        { name: '松江区', lng: 121.23 },
        { name: '青浦区', lng: 121.12 },
        { name: '奉贤区', lng: 121.47 },
        { name: '金山区', lng: 121.34 },
        { name: '崇明区', lng: 121.40 }
      ]
    },
    {
      province: '天津市',
      cities: [
        { name: '天津 (市中心)', lng: 117.20 },
        { name: '滨海新区', lng: 117.70 },
        { name: '西青区', lng: 117.01 },
        { name: '武清区', lng: 117.04 },
        { name: '宝坻区', lng: 117.31 },
        { name: '蓟州区', lng: 117.41 },
        { name: '静海区', lng: 116.92 },
        { name: '宁河区', lng: 117.83 }
      ]
    },
    {
      province: '重庆市',
      cities: [
        { name: '重庆 (主城区)', lng: 106.55 },
        { name: '万州区', lng: 108.41 },
        { name: '涪陵区', lng: 107.39 },
        { name: '黔江区', lng: 108.79 },
        { name: '长寿区', lng: 107.07 },
        { name: '江津区', lng: 106.26 },
        { name: '合川区', lng: 106.28 },
        { name: '永川区', lng: 105.93 },
        { name: '南川区', lng: 107.10 },
        { name: '开州区', lng: 108.39 },
        { name: '梁平区', lng: 107.80 },
        { name: '武隆区', lng: 107.76 }
      ]
    },
    {
      province: '河北省',
      cities: [
        { name: '石家庄', lng: 114.51 }, { name: '唐山', lng: 118.18 }, { name: '秦皇岛', lng: 119.60 },
        { name: '邯郸', lng: 114.54 }, { name: '邢台', lng: 114.50 }, { name: '保定', lng: 115.46 },
        { name: '张家口', lng: 114.88 }, { name: '承德', lng: 117.96 }, { name: '沧州', lng: 116.84 },
        { name: '廊坊', lng: 116.68 }, { name: '衡水', lng: 115.67 }, { name: '雄安新区', lng: 115.93 },
        { name: '定州', lng: 114.99 }, { name: '辛集', lng: 115.21 }
      ]
    },
    {
      province: '山西省',
      cities: [
        { name: '太原', lng: 112.55 }, { name: '大同', lng: 113.30 }, { name: '阳泉', lng: 113.58 },
        { name: '长治', lng: 113.12 }, { name: '晋城', lng: 112.85 }, { name: '朔州', lng: 112.43 },
        { name: '晋中', lng: 112.75 }, { name: '运城', lng: 111.01 }, { name: '忻州', lng: 112.73 },
        { name: '临汾', lng: 111.52 }, { name: '吕梁', lng: 111.14 }
      ]
    },
    {
      province: '内蒙古自治区',
      cities: [
        { name: '呼和浩特', lng: 111.75 }, { name: '包头', lng: 109.84 }, { name: '乌海', lng: 106.82 },
        { name: '赤峰', lng: 118.96 }, { name: '通辽', lng: 122.26 }, { name: '鄂尔多斯', lng: 109.99 },
        { name: '呼伦贝尔', lng: 119.77 }, { name: '巴彦淖尔', lng: 107.42 }, { name: '乌兰察布', lng: 113.13 },
        { name: '兴安盟(乌兰浩特)', lng: 122.07 }, { name: '锡林郭勒盟(锡林浩特)', lng: 116.09 },
        { name: '阿拉善盟', lng: 105.73 }, { name: '满洲里', lng: 117.45 }
      ]
    },
    {
      province: '辽宁省',
      cities: [
        { name: '沈阳', lng: 123.43 }, { name: '大连', lng: 121.61 }, { name: '鞍山', lng: 122.99 },
        { name: '抚顺', lng: 123.96 }, { name: '本溪', lng: 123.77 }, { name: '丹东', lng: 124.38 },
        { name: '锦州', lng: 121.13 }, { name: '营口', lng: 122.23 }, { name: '阜新', lng: 121.67 },
        { name: '辽阳', lng: 123.17 }, { name: '盘锦', lng: 122.07 }, { name: '铁岭', lng: 123.84 },
        { name: '朝阳', lng: 120.45 }, { name: '葫芦岛', lng: 120.86 }
      ]
    },
    {
      province: '吉林省',
      cities: [
        { name: '长春', lng: 125.32 }, { name: '吉林市', lng: 126.55 }, { name: '四平', lng: 124.37 },
        { name: '辽源', lng: 125.14 }, { name: '通化', lng: 125.94 }, { name: '白山', lng: 126.43 },
        { name: '松原', lng: 124.83 }, { name: '白城', lng: 122.84 }, { name: '延吉(延边)', lng: 129.51 }
      ]
    },
    {
      province: '黑龙江省',
      cities: [
        { name: '哈尔滨', lng: 126.64 }, { name: '齐齐哈尔', lng: 123.95 }, { name: '鸡西', lng: 130.97 },
        { name: '鹤岗', lng: 130.28 }, { name: '双鸭山', lng: 131.16 }, { name: '大庆', lng: 125.11 },
        { name: '伊春', lng: 128.90 }, { name: '佳木斯', lng: 130.36 }, { name: '七台河', lng: 130.85 },
        { name: '牡丹江', lng: 129.61 }, { name: '黑河', lng: 127.50 }, { name: '绥化', lng: 126.99 },
        { name: '大兴安岭(加格达奇)', lng: 124.12 }
      ]
    },
    {
      province: '江苏省',
      cities: [
        { name: '南京', lng: 118.80 }, { name: '无锡', lng: 120.31 }, { name: '徐州', lng: 117.18 },
        { name: '常州', lng: 119.97 }, { name: '苏州', lng: 120.62 }, { name: '南通', lng: 120.89 },
        { name: '连云港', lng: 119.22 }, { name: '淮安', lng: 119.02 }, { name: '盐城', lng: 120.16 },
        { name: '扬州', lng: 119.41 }, { name: '镇江', lng: 119.45 }, { name: '泰州', lng: 119.92 },
        { name: '宿迁', lng: 118.28 }, { name: '昆山', lng: 120.98 }, { name: '江阴', lng: 120.28 },
        { name: '常熟', lng: 120.75 }, { name: '张家港', lng: 120.55 }, { name: '宜兴', lng: 119.82 }
      ]
    },
    {
      province: '浙江省',
      cities: [
        { name: '杭州', lng: 120.16 }, { name: '宁波', lng: 121.55 }, { name: '温州', lng: 120.70 },
        { name: '嘉兴', lng: 120.76 }, { name: '湖州', lng: 120.09 }, { name: '绍兴', lng: 120.58 },
        { name: '金华', lng: 119.65 }, { name: '衢州', lng: 118.86 }, { name: '舟山', lng: 122.21 },
        { name: '台州', lng: 121.42 }, { name: '丽水', lng: 119.92 }, { name: '义乌', lng: 120.08 },
        { name: '慈溪', lng: 121.27 }, { name: '余姚', lng: 121.16 }, { name: '诸暨', lng: 120.23 }
      ]
    },
    {
      province: '安徽省',
      cities: [
        { name: '合肥', lng: 117.23 }, { name: '芜湖', lng: 118.38 }, { name: '蚌埠', lng: 117.39 },
        { name: '淮南', lng: 117.02 }, { name: '马鞍山', lng: 118.51 }, { name: '淮北', lng: 116.80 },
        { name: '铜陵', lng: 117.81 }, { name: '安庆', lng: 117.06 }, { name: '黄山', lng: 118.34 },
        { name: '滁州', lng: 118.32 }, { name: '阜阳', lng: 115.81 }, { name: '宿州', lng: 116.98 },
        { name: '六安', lng: 116.51 }, { name: '亳州', lng: 115.78 }, { name: '池州', lng: 117.49 },
        { name: '宣城', lng: 118.76 }
      ]
    },
    {
      province: '福建省',
      cities: [
        { name: '福州', lng: 119.30 }, { name: '厦门', lng: 118.09 }, { name: '莆田', lng: 119.01 },
        { name: '三明', lng: 117.64 }, { name: '泉州', lng: 118.68 }, { name: '漳州', lng: 117.65 },
        { name: '南平', lng: 118.18 }, { name: '龙岩', lng: 117.03 }, { name: '宁德', lng: 119.55 },
        { name: '晋江', lng: 118.58 }, { name: '石狮', lng: 118.65 }, { name: '福清', lng: 119.38 }
      ]
    },
    {
      province: '江西省',
      cities: [
        { name: '南昌', lng: 115.86 }, { name: '景德镇', lng: 117.18 }, { name: '萍乡', lng: 113.85 },
        { name: '九江', lng: 116.00 }, { name: '新余', lng: 114.93 }, { name: '鹰潭', lng: 117.07 },
        { name: '赣州', lng: 114.93 }, { name: '吉安', lng: 114.99 }, { name: '宜春', lng: 114.42 },
        { name: '抚州', lng: 116.36 }, { name: '上饶', lng: 117.94 }
      ]
    },
    {
      province: '山东省',
      cities: [
        { name: '济南', lng: 117.02 }, { name: '青岛', lng: 120.38 }, { name: '淄博', lng: 118.05 },
        { name: '枣庄', lng: 117.32 }, { name: '东营', lng: 118.67 }, { name: '烟台', lng: 121.45 },
        { name: '潍坊', lng: 119.16 }, { name: '济宁', lng: 116.59 }, { name: '泰安', lng: 117.09 },
        { name: '威海', lng: 122.12 }, { name: '日照', lng: 119.53 }, { name: '临沂', lng: 118.36 },
        { name: '德州', lng: 116.36 }, { name: '聊城', lng: 115.99 }, { name: '滨州', lng: 117.97 },
        { name: '菏泽', lng: 115.48 }
      ]
    },
    {
      province: '河南省',
      cities: [
        { name: '郑州', lng: 113.63 }, { name: '开封', lng: 114.31 }, { name: '洛阳', lng: 112.45 },
        { name: '平顶山', lng: 113.19 }, { name: '安阳', lng: 114.39 }, { name: '鹤壁', lng: 114.30 },
        { name: '新乡', lng: 113.93 }, { name: '焦作', lng: 113.24 }, { name: '濮阳', lng: 115.04 },
        { name: '许昌', lng: 113.85 }, { name: '漯河', lng: 114.02 }, { name: '三门峡', lng: 111.20 },
        { name: '南阳', lng: 112.53 }, { name: '商丘', lng: 115.66 }, { name: '信阳', lng: 114.09 },
        { name: '周口', lng: 114.70 }, { name: '驻马店', lng: 114.02 }, { name: '济源', lng: 112.60 }
      ]
    },
    {
      province: '湖北省',
      cities: [
        { name: '武汉', lng: 114.31 }, { name: '黄石', lng: 115.04 }, { name: '十堰', lng: 110.80 },
        { name: '宜昌', lng: 111.29 }, { name: '襄阳', lng: 112.12 }, { name: '鄂州', lng: 114.89 },
        { name: '荆门', lng: 112.20 }, { name: '孝感', lng: 113.92 }, { name: '荆州', lng: 112.24 },
        { name: '黄冈', lng: 114.87 }, { name: '咸宁', lng: 114.33 }, { name: '随州', lng: 113.38 },
        { name: '恩施', lng: 109.49 }, { name: '仙桃', lng: 113.45 }, { name: '潜江', lng: 112.90 },
        { name: '天门', lng: 113.17 }, { name: '神农架', lng: 110.68 }
      ]
    },
    {
      province: '湖南省',
      cities: [
        { name: '长沙', lng: 112.94 }, { name: '株洲', lng: 113.13 }, { name: '湘潭', lng: 112.94 },
        { name: '衡阳', lng: 112.57 }, { name: '邵阳', lng: 111.47 }, { name: '岳阳', lng: 113.13 },
        { name: '常德', lng: 111.69 }, { name: '张家界', lng: 110.48 }, { name: '益阳', lng: 112.36 },
        { name: '郴州', lng: 113.01 }, { name: '永州', lng: 111.61 }, { name: '怀化', lng: 109.99 },
        { name: '娄底', lng: 112.01 }, { name: '吉首(湘西)', lng: 109.74 }
      ]
    },
    {
      province: '广东省',
      cities: [
        { name: '广州', lng: 113.26 }, { name: '深圳', lng: 114.06 }, { name: '珠海', lng: 113.58 },
        { name: '汕头', lng: 116.68 }, { name: '佛山', lng: 113.12 }, { name: '韶关', lng: 113.60 },
        { name: '湛江', lng: 110.36 }, { name: '肇庆', lng: 112.47 }, { name: '江门', lng: 113.08 },
        { name: '茂名', lng: 110.93 }, { name: '惠州', lng: 114.42 }, { name: '梅州', lng: 116.12 },
        { name: '汕尾', lng: 115.36 }, { name: '河源', lng: 114.70 }, { name: '阳江', lng: 111.98 },
        { name: '清远', lng: 113.06 }, { name: '东莞', lng: 113.75 }, { name: '中山', lng: 113.39 },
        { name: '潮州', lng: 116.62 }, { name: '揭阳', lng: 116.37 }, { name: '云浮', lng: 112.04 }
      ]
    },
    {
      province: '广西壮族自治区',
      cities: [
        { name: '南宁', lng: 108.37 }, { name: '柳州', lng: 109.43 }, { name: '桂林', lng: 110.29 },
        { name: '梧州', lng: 111.32 }, { name: '北海', lng: 109.12 }, { name: '防城港', lng: 108.35 },
        { name: '钦州', lng: 108.62 }, { name: '贵港', lng: 109.60 }, { name: '玉林', lng: 110.15 },
        { name: '百色', lng: 106.62 }, { name: '贺州', lng: 111.55 }, { name: '河池', lng: 108.06 },
        { name: '来宾', lng: 109.23 }, { name: '崇左', lng: 107.36 }
      ]
    },
    {
      province: '海南省',
      cities: [
        { name: '海口', lng: 110.33 }, { name: '三亚', lng: 109.51 }, { name: '三沙', lng: 112.33 },
        { name: '儋州', lng: 109.58 }, { name: '琼海', lng: 110.47 }, { name: '文昌', lng: 110.75 },
        { name: '万宁', lng: 110.39 }, { name: '东方', lng: 108.65 }
      ]
    },
    {
      province: '四川省',
      cities: [
        { name: '成都', lng: 104.07 }, { name: '自贡', lng: 104.78 }, { name: '攀枝花', lng: 101.72 },
        { name: '泸州', lng: 105.44 }, { name: '德阳', lng: 104.40 }, { name: '绵阳', lng: 104.74 },
        { name: '广元', lng: 105.84 }, { name: '遂宁', lng: 105.59 }, { name: '内江', lng: 105.06 },
        { name: '乐山', lng: 103.77 }, { name: '南充', lng: 106.08 }, { name: '眉山', lng: 103.85 },
        { name: '宜宾', lng: 104.64 }, { name: '广安', lng: 106.63 }, { name: '达州', lng: 107.50 },
        { name: '雅安', lng: 103.00 }, { name: '巴中', lng: 106.75 }, { name: '资阳', lng: 104.65 },
        { name: '马尔康(阿坝)', lng: 102.22 }, { name: '康定(甘孜)', lng: 101.96 }, { name: '西昌(凉山)', lng: 102.26 }
      ]
    },
    {
      province: '贵州省',
      cities: [
        { name: '贵阳', lng: 106.71 }, { name: '六盘水', lng: 104.83 }, { name: '遵义', lng: 106.93 },
        { name: '安顺', lng: 105.95 }, { name: '毕节', lng: 105.28 }, { name: '铜仁', lng: 109.19 },
        { name: '兴义(黔西南)', lng: 104.90 }, { name: '凯里(黔东南)', lng: 107.98 }, { name: '都匀(黔南)', lng: 107.52 }
      ]
    },
    {
      province: '云南省',
      cities: [
        { name: '昆明', lng: 102.71 }, { name: '曲靖', lng: 103.80 }, { name: '玉溪', lng: 102.55 },
        { name: '保山', lng: 99.16 }, { name: '昭通', lng: 103.72 }, { name: '丽江', lng: 100.23 },
        { name: '普洱', lng: 100.97 }, { name: '临沧', lng: 100.09 }, { name: '楚雄', lng: 101.53 },
        { name: '蒙自(红河)', lng: 103.38 }, { name: '文山', lng: 104.24 }, { name: '景洪(西双版纳)', lng: 100.80 },
        { name: '大理', lng: 100.23 }, { name: '芒市(德宏)', lng: 98.59 }, { name: '泸水(怒江)', lng: 98.85 },
        { name: '香格里拉(迪庆)', lng: 99.71 }
      ]
    },
    {
      province: '西藏自治区',
      cities: [
        { name: '拉萨', lng: 91.13 }, { name: '日喀则', lng: 88.88 }, { name: '昌都', lng: 97.18 },
        { name: '林芝', lng: 94.36 }, { name: '山南', lng: 91.77 }, { name: '那曲', lng: 92.06 },
        { name: '阿里(狮泉河)', lng: 80.11 }
      ]
    },
    {
      province: '陕西省',
      cities: [
        { name: '西安', lng: 108.94 }, { name: '铜川', lng: 108.97 }, { name: '宝鸡', lng: 107.14 },
        { name: '咸阳', lng: 108.71 }, { name: '渭南', lng: 109.50 }, { name: '延安', lng: 109.49 },
        { name: '汉中', lng: 107.03 }, { name: '榆林', lng: 109.74 }, { name: '安康', lng: 109.03 },
        { name: '商洛', lng: 109.94 }, { name: '西咸新区', lng: 108.72 }
      ]
    },
    {
      province: '甘肃省',
      cities: [
        { name: '兰州', lng: 103.82 }, { name: '嘉峪关', lng: 98.28 }, { name: '金昌', lng: 102.19 },
        { name: '白银', lng: 104.17 }, { name: '天水', lng: 105.72 }, { name: '武威', lng: 102.64 },
        { name: '张掖', lng: 100.46 }, { name: '平凉', lng: 106.67 }, { name: '酒泉', lng: 98.51 },
        { name: '庆阳', lng: 107.64 }, { name: '定西', lng: 104.63 }, { name: '陇南', lng: 104.92 },
        { name: '临夏', lng: 103.21 }, { name: '合作(甘南)', lng: 102.91 }, { name: '敦煌', lng: 94.66 }
      ]
    },
    {
      province: '青海省',
      cities: [
        { name: '西宁', lng: 101.78 }, { name: '海东', lng: 102.10 }, { name: '海北(西海)', lng: 100.90 },
        { name: '黄南(同仁)', lng: 102.02 }, { name: '海南州(共和)', lng: 100.62 }, { name: '果洛(玛沁)', lng: 100.24 },
        { name: '玉树', lng: 97.01 }, { name: '海西(德令哈)', lng: 97.37 }, { name: '格尔木', lng: 94.90 }
      ]
    },
    {
      province: '宁夏回族自治区',
      cities: [
        { name: '银川', lng: 106.28 }, { name: '石嘴山', lng: 106.38 }, { name: '吴忠', lng: 106.20 },
        { name: '固原', lng: 106.28 }, { name: '中卫', lng: 105.19 }
      ]
    },
    {
      province: '新疆维吾尔自治区',
      cities: [
        { name: '乌鲁木齐', lng: 87.62 }, { name: '克拉玛依', lng: 84.87 }, { name: '吐鲁番', lng: 89.19 },
        { name: '哈密', lng: 93.51 }, { name: '昌吉', lng: 87.30 }, { name: '博乐(博尔塔拉)', lng: 82.07 },
        { name: '库尔勒(巴音郭楞)', lng: 86.15 }, { name: '阿克苏', lng: 80.26 }, { name: '阿图什(克孜勒苏)', lng: 76.17 },
        { name: '喀什', lng: 75.99 }, { name: '和田', lng: 79.92 }, { name: '伊宁(伊犁)', lng: 81.32 },
        { name: '塔城', lng: 82.98 }, { name: '阿勒泰', lng: 88.14 }, { name: '石河子', lng: 86.04 },
        { name: '阿拉尔', lng: 81.28 }, { name: '图木舒克', lng: 79.08 }, { name: '五家渠', lng: 87.54 }
      ]
    },
    {
      province: '港澳台地区',
      cities: [
        { name: '香港特别行政区', lng: 114.17 }, { name: '澳门特别行政区', lng: 113.54 },
        { name: '台北市', lng: 121.57 }, { name: '新北市', lng: 121.46 }, { name: '高雄市', lng: 120.31 },
        { name: '台中市', lng: 120.68 }, { name: '台南市', lng: 120.19 }, { name: '新竹市', lng: 120.97 },
        { name: '桃园市', lng: 121.30 }, { name: '基隆市', lng: 121.74 }
      ]
    },
    {
      province: '海外主要城市',
      cities: [
        { name: '伦敦 (英国)', lng: -0.12 }, { name: '巴黎 (法国)', lng: 2.35 }, { name: '柏林 (德国)', lng: 13.40 },
        { name: '东京 (日本)', lng: 139.69 }, { name: '首尔 (韩国)', lng: 126.98 }, { name: '新加坡', lng: 103.82 },
        { name: '曼谷 (泰国)', lng: 100.50 }, { name: '吉隆坡 (马来西亚)', lng: 101.69 },
        { name: '悉尼 (澳大利亚)', lng: 151.21 }, { name: '墨尔本 (澳大利亚)', lng: 144.96 },
        { name: '奥克兰 (新西兰)', lng: 174.76 },
        { name: '纽约 (美国东部)', lng: -74.00 }, { name: '洛杉矶 (美国西部)', lng: -118.24 },
        { name: '旧金山 (美国西部)', lng: -122.42 }, { name: '芝加哥 (美国中部)', lng: -87.63 },
        { name: '多伦多 (加拿大)', lng: -79.38 }, { name: '温哥华 (加拿大)', lng: -123.12 }
      ]
    }
  ];

  /**
   * 计算经度相对东经 120°E 的真太阳时偏差（单位：分钟）
   * 结果保留 1 位小数，正数表示比北京时间快，负数表示比北京时间慢
   */
  function calcSolarDiffMinutes(lng) {
    if (typeof lng !== 'number' || isNaN(lng)) return 0;
    return Math.round((lng - 120) * 4 * 10) / 10;
  }

  /**
   * 格式化时差展示字符串
   * 例如："+2.4 分钟 (快 2分24秒)" 或 "-64.0 分钟 (慢 1小时4分)"
   */
  function formatSolarDiffText(diffMinutes) {
    if (Math.abs(diffMinutes) < 0.1) {
      return '0 分钟 (与北京时间无时差)';
    }
    const sign = diffMinutes > 0 ? '+' : '-';
    const absM = Math.abs(diffMinutes);
    const totalSec = Math.round(absM * 60);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;

    let timeDesc = '';
    if (h > 0) {
      timeDesc = `${h}小时${m}分`;
    } else {
      timeDesc = `${m}分${s > 0 ? s + '秒' : ''}`;
    }

    const direction = diffMinutes > 0 ? '快' : '慢';
    return `${sign}${absM.toFixed(1)} 分钟 (较北京时间${direction} ${timeDesc})`;
  }

  /**
   * 模糊搜索城市
   */
  function searchCity(query) {
    if (!query || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    const hits = [];
    for (let pIdx = 0; pIdx < CHINA_PROVINCES.length; pIdx++) {
      const p = CHINA_PROVINCES[pIdx];
      for (let cIdx = 0; cIdx < p.cities.length; cIdx++) {
        const c = p.cities[cIdx];
        if (c.name.toLowerCase().includes(q) || p.province.toLowerCase().includes(q)) {
          hits.push({
            provinceIndex: pIdx,
            cityIndex: cIdx,
            province: p.province,
            cityName: c.name,
            lng: c.lng,
            diff: calcSolarDiffMinutes(c.lng)
          });
        }
      }
    }
    return hits;
  }

  window.BaziCities = {
    provinces: CHINA_PROVINCES,
    calcSolarDiffMinutes,
    formatSolarDiffText,
    searchCity
  };
})();

'use strict';
(function(root){
 const pets=[
  {
    "id": 0,
    "key": "bird",
    "name": "蓝翎啾啾",
    "color": "#779ee9",
    "image": "assets/pets/bird.png",
    "desc": "把风藏进蓝色翅膀，勇敢替你探一探前路。"
  },
  {
    "id": 1,
    "key": "cloud",
    "name": "云绵朵朵",
    "color": "#99cbbd",
    "image": "assets/pets/cloud.png",
    "desc": "脸颊藏着一小片晚霞，拥抱就能赶走坏心情。"
  },
  {
    "id": 2,
    "key": "rabbit",
    "name": "绒耳跳跳",
    "color": "#b09ad6",
    "image": "assets/pets/rabbit.png",
    "desc": "长耳朵接住每个新消息，也接住你的小情绪。"
  },
  {
    "id": 3,
    "key": "bear",
    "name": "暖围抱抱",
    "color": "#d6ad52",
    "image": "assets/pets/bear.png",
    "desc": "黄围巾是阳光织的，想把安全感分你一半。"
  },
  {
    "id": 4,
    "key": "dog",
    "name": "毛衣汪汪",
    "color": "#7facc6",
    "image": "assets/pets/dog.png",
    "desc": "把陪伴织进蓝毛衣，你一回头，它就会在。"
  },
  {
    "id": 5,
    "key": "xiaop",
    "name": "小P",
    "image": "assets/pets/xiaop.png",
    "color": "#82d8d7",
    "desc": "白色机身、青色眼睛的悬浮伙伴；双腿自然垂下，在乐园里轻轻漂浮。"
  }
];
 root.PetDesign={pets};
 if(typeof module==='object'&&module.exports)module.exports=root.PetDesign;
})(typeof window!=='undefined'?window:globalThis);

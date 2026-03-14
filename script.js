body{
margin:0;
font-family:'Segoe UI',sans-serif;
background:#f4f5f7;
}

/* ===== 상단바 ===== */

.navbar{
display:flex;
align-items:center;
justify-content:space-between;
padding:14px 40px;
background:white;
border-bottom:1px solid #e5e7eb;
}

.logo{
font-weight:700;
font-size:18px;
}

/* 검색 */

.search-box{
flex:1;
display:flex;
justify-content:center;
}

.search-box input{
width:420px;
padding:12px 20px;
border-radius:30px;
border:1px solid #ddd;
background:#fafafa;
outline:none;
}

/* 버튼 */

.nav-right button{
margin-left:10px;
padding:7px 16px;
border-radius:20px;
border:none;
background:#5b6ef5;
color:white;
cursor:pointer;
}

/* ===== 배너 ===== */

.hero{

width:90%;
height:300px;

margin:30px auto;

border-radius:20px;

background:url("https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070") center/cover;

display:flex;
align-items:center;
justify-content:center;

color:white;
text-align:center;

box-shadow:0 10px 30px rgba(0,0,0,0.25);

}

.hero h1{
font-size:32px;
margin:0;
}

.hero p{
margin-top:10px;
}

/* ===== 카테고리 ===== */

.category-bar{

display:flex;
justify-content:center;
gap:10px;

margin:20px;

flex-wrap:wrap;

}

.category-bar button{

padding:8px 18px;

border-radius:20px;

border:1px solid #ddd;

background:white;

cursor:pointer;

}

/* ===== 상품 ===== */

.container{
max-width:1200px;
margin:auto;
padding:30px;
}

.product-grid{

display:grid;

grid-template-columns:repeat(auto-fill,minmax(250px,1fr));

gap:25px;

}

.card{

background:white;

padding:20px;

border-radius:14px;

box-shadow:0 5px 20px rgba(0,0,0,0.08);

cursor:pointer;

transition:0.2s;

}

.card:hover{

transform:translateY(-6px);

}

.card img{

width:100%;
border-radius:8px;

}

.price{
color:#5b6ef5;
font-weight:bold;
}

/* ===== 모달 ===== */

.modal{

display:none;

position:fixed;

left:0;
top:0;

width:100%;
height:100%;

background:rgba(0,0,0,0.5);

}

.modal-content{

background:white;

width:420px;

margin:120px auto;

padding:25px;

border-radius:12px;

text-align:center;

}

.modal-content img{
width:100%;
border-radius:8px;
}

.modal-content input{

width:95%;
padding:10px;

margin:6px;

border:1px solid #ddd;

border-radius:6px;

}

#modalClose,#adminClose,#adminPanelClose{

float:right;

font-size:22px;

cursor:pointer;

}





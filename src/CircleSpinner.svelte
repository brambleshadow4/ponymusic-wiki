<div class="loader"></div>

<style>
.loader {
  border-radius: 20px;
  border-width: 1px;
  border-color: red;
}

.loader:before,
.loader:after {
  border-radius: 50%;
}
.loader {
  color: #FFFFFF;
  text-indent: -99999em;
  margin: 5px auto;
  position: relative;
  width: 40px;
  height: 40px;
  box-shadow: inset 0 0 0 5px;
  -webkit-transform: translateZ(0);
  -ms-transform: translateZ(0);
  transform: translateZ(0);
}
.loader:before,
.loader:after {
  position: absolute;
  content: '';
}
.loader:before {
  width: 22px;
  height: 44px;

  background: #101010;
  border-radius: 44px 0 0 44px;
  top: -2px;
  left: -2px;
  -webkit-transform-origin: 22px 22px;
  transform-origin: 22px 22px;
  -webkit-animation: load2 2s infinite ease 1.5s;
  animation: load2 2s infinite ease 1.5s;
}
.loader:after {
  width: 22px;
  height: 44px;
  background: #101010;
  border-radius: 0 44px 44px 0;
  top: -2px;
  left: 21px;
  -webkit-transform-origin: 0px 0px;
  transform-origin: 0 22px;
  -webkit-animation: load2 2s infinite ease;
  animation: load2 2s infinite ease;
}
@-webkit-keyframes load2 {
  0% {
    -webkit-transform: rotate(0deg);
    transform: rotate(0deg);
  }
  100% {
    -webkit-transform: rotate(360deg);
    transform: rotate(360deg);
  }
}
@keyframes load2 {
  0% {
    -webkit-transform: rotate(0deg);
    transform: rotate(0deg);
  }
  100% {
    -webkit-transform: rotate(360deg);
    transform: rotate(360deg);
  }
}

</style>
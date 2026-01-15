# 「阅读3.0」 kindle web 书架
本程序为「阅读3.0」的配套 kindle web 端，需要保证手机和kindle在同一局域网内，然后手机端打开 web 服务。


## QA

### 报错：Mixed Content: XXX the content must be served over HTTPS.
~~~
Mixed Content: The page at 'https://k.dh8.link/' was loaded over HTTPS, but requested an insecure XMLHttpRequest endpoint 'http://172.19.0.1:1122/getBookshelf'. This request has been blocked; the content must be served over HTTPS.
~~~

问题场景：https的页面，设置本地链接后点确定报错

解决：允许转发网站进行本地网络访问（一般左上角锁那里弹出）。但是对于kindle设备没法弹，因此不用使用https，用普通http就行


### 报错：Access to XMLHttpRequest XXX blocked by CORS policy
~~~
Access to XMLHttpRequest at 'http://172.19.0.1:1122/getBookshelf' from origin 'http://202.165.123.76:1122' has been blocked by CORS policy: The request client is not a secure context and the resource is in more-private address space `local`.
~~~

问题场景：http页面，设置本地链接后点击报错

解决：尝试https（你要是问这不是和上面冲突了吗？确实，简直左右脑互搏，但这个报错是出现在谷歌浏览器上，在kindle上不会报错，所以我目前通过http使用的）
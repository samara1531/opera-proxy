```
$ ./opera-proxy -list-countries
country code,country name
EU,Europe
AS,Asia
AM,Americas
```

## List of arguments

| Argument | Type | Description |
| -------- | ---- | ----------- |
| api-address | String | override IP address of api2.sec-tunnel.com |
| api-client-type | String | client type reported to SurfEasy API (default "se0316") |
| api-client-version | String | client version reported to SurfEasy API (default "Stable 114.0.5282.21") |
| api-login | String | SurfEasy API login (default "se0316") |
| api-password | String | SurfEasy API password (default "SILrMEPBmJuhomxWkfm3JalqHX2Eheg1YhlEZiMh8II") |
| api-proxy | String | additional proxy server used to access SurfEasy API |
| api-user-agent | String | user agent reported to SurfEasy API (default "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 OPR/114.0.0.0") |
| bind-address | String | proxy listen address (default "127.0.0.1:18080") |
| bootstrap-dns | String | Comma-separated list of DNS/DoH/DoT resolvers for initial discovery of SurfEasy API address. Supported schemes are: `dns://`, `https://`, `tls://`, `tcp://`. Examples: `https://1.1.1.1/dns-query`, `tls://9.9.9.9:853`  (default `https://1.1.1.3/dns-query,https://8.8.8.8/dns-query,https://dns.google/dns-query,https://security.cloudflare-dns.com/dns-query,https://fidelity.vm-0.com/q,https://wikimedia-dns.org/dns-query,https://dns.adguard-dns.com/dns-query,https://dns.quad9.net/dns-query,https://doh.cleanbrowsing.org/doh/adult-filter/`) |
| cafile | String | use custom CA certificate bundle file |
| config | String | read configuration from file with space-separated keys and values |
| country | String | desired proxy location (default "EU") |
| dp-export | - | export configuration for dumbproxy |
| fake-SNI | String | domain name to use as SNI in communications with servers |
| init-retries | Number | number of attempts for initialization steps, zero for unlimited retry |
| init-retry-interval | Duration | delay between initialization retries (default 5s) |
| list-countries | - | list available countries and exit |
| list-proxies | - | output proxy list and exit |
| override-proxy-address | string | use fixed proxy address instead of server address returned by SurfEasy API |
| proxy | String | sets base proxy to use for all dial-outs. Format: `<http\|https\|socks5\|socks5h>://[login:password@]host[:port]` Examples: `http://user:password@192.168.1.1:3128`, `socks5://10.0.0.1:1080` |
| refresh | Duration | login refresh interval (default 4h0m0s) |
| refresh-retry | Duration | login refresh retry interval (default 5s) |
| server-selection | Enum | server selection policy (first/random/fastest) (default fastest) |
| server-selection-dl-limit | Number | restrict amount of downloaded data per connection by fastest server selection |
| server-selection-test-url | String | URL used for download benchmark by fastest server selection policy (default `https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular.min.js`) |
| server-selection-timeout | Duration | timeout given for server selection function to produce result (default 30s) |
| timeout | Duration | timeout for network operations (default 10s) |
| verbosity | Number | logging verbosity (10 - debug, 20 - info, 30 - warning, 40 - error, 50 - critical) (default 20) |
| version | - | show program version and exit |
| socks-mode | - | listen for SOCKS requests instead of HTTP |

## See also
* [Community in Telegram](https://t.me/alternative_proxy)

# Learning Space Candle 3D Avatar Space

NPO法人BeWith / Learning Space Candle の「縁日食堂」向け3Dアバター空間プロトタイプです。

## GitHub Pagesで公開する手順

1. GitHubで新しいリポジトリを作成します。
2. このフォルダ内のファイルをアップロードします。
   - `index.html`
   - `styles.css`
   - `app.js`
   - `.nojekyll`
   - `README.md`
3. リポジトリの `Settings` を開きます。
4. `Pages` を開きます。
5. `Build and deployment` の `Source` を `Deploy from a branch` にします。
6. `Branch` を `main`、フォルダを `/root` にして保存します。
7. 数十秒から数分後に表示されるURLで公開されます。

## 操作

- 画面中央の「クリックして会場に入る」を押すと、マウスで視点操作できます。
- `WASD` または矢印キーでアバターを移動できます。
- `Shift` を押しながら移動すると少し速く歩けます。
- 右側のボタンで入口、学生テーブル、社会人テーブル、食堂カウンターへ移動できます。
- スマートフォン幅では左下に移動ボタンが表示されます。

## 注意

3D表示にはThree.jsをCDNから読み込んでいます。閲覧時にインターネット接続が必要です。

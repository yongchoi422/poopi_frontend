from pathlib import Path
import json,shutil
p=Path(__file__).resolve().parent
read=lambda n:json.loads((p/n).read_text(encoding='utf-8'))
archive=p/'revisions/pre-batch3-final/completion-report.json'
if not archive.exists():shutil.copy2(p/'completion-report.json',archive)
assets=read('support-80-metadata.json')
for a in assets:
 assert Path(a['local_file']).stat().st_size==int(a['metadata']['size'])
assert len(assets)==6
report={'completed_on':'2026-10-02','scope':'preparation_only','videos':80,'added_this_batch':40,'new_episode_ids':[str(n) for n in range(41,81)],'regenerated_new_ids':['41','46','47','58','70','73','74','77','80'],'edited_new_ids':['49'],'published':False,'scheduled':False,'live_website_changed':False,'other_thread_messaged':False,'root_folder':'https://drive.google.com/drive/folders/1PFx3kre_rFMnmxNmTPYDVZhHKVNu3KND','assets':assets,'verification':{'video_count':80,'new_accepted_reviews':40,'unique_video_hashes':80,'full_decode':True,'format':'1280x720, 24fps, 8s, H.264, muted','new_drive_video_sizes_match':True,'zip_bytes':171912736,'zip_test_passed':True,'zip_mp4_count':82,'local_catalog_links_valid':True,'new_filter_visible_count':40,'browser_video_playback':'episode-41 reached 8.0s, ended true, media error null'},'proofs':['library-80-new40-proof.png','drive-80-delivery-proof.png','flow-80-production-proof.png'],'notes':['New keyframes generated with built-in Codex image generator; video motion generated in Google Flow Omni 1.1 Flash.','Episode 49 uses a 1.25-second clean-frame hold; rejected originals retained locally.','Review samples sixteen temporal frames per new video; not a promise of pixel-perfect SVG identity or seamless looping.','The retained 1080p homepage hero is a local upscale from a 720p original.','The full ZIP was uploaded through the Google Drive browser after the connector attempt returned no confirmed upload. Drive metadata verified its byte size and parent.']}
(p/'completion-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('80-video completion report saved; all 6 support files byte-verified')

require 'fileutils'

name = ARGV[0]
FileUtils.mkdir name unless File.directory?(name)

def source_file(ext)
  ext == 'jpeg' ? 'jpg.jpg' : "#{ext}.#{ext}"
end

(0..119).each do |n|
  left_formats = ['mp3', 'png', 'jpg', 'mp4', '']
  right_formats = ['webp', 'jpg', 'gif', 'mp3', 'mp4', '']
  left_index = n % 5
  right_index = n % 6
  left = left_formats[left_index]
  right = right_formats[right_index]
  index = n + 1
  left = 'jpeg' if left == 'jpg' && index % 3 == 0
  left = 'm4a' if left == 'mp4' && index % 7 == 0
  right = 'jpeg' if right == 'jpg' && index % 10 == 0
  right = 'm4a' if right == 'mp4' && index % 5 == 0
  unless left.empty?
    # FileUtils.copy_file(source_file(left), "#{name}/#{index.to_s.rjust(3, '0')}.#{left}")
    puts "Will create #{name}/#{index.to_s.rjust(3, '0')}.#{left} from #{source_file(left)}"
  end
  unless right.empty?
    # FileUtils.copy_file(source_file(right), "#{name}/#{index.to_s.rjust(3, '0')}a.#{right}")
    puts "Will create #{name}/#{index.to_s.rjust(3, '0')}a.#{right} from #{source_file(right)}"
  end
end
